"""
OEM RS — Backend Flask
Processa PDF da OP: organiza, gera etiquetas de módulo e embalagem.
Também serve o frontend (index.html + js/ + css/ + assets/) para acesso via celular.
"""
import base64
import io
import os
import re
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from flask import Flask, jsonify, request, send_from_directory
import mimetypes
mimetypes.add_type('model/gltf-binary', '.glb')
mimetypes.add_type('model/gltf+json', '.gltf')

from label_corte import build_corte_document
from label_generator_embalagem_final import build_embalagem_document
from label_generator_modulo_corrigido import build_label_documents
from op_organizer import reorder_pdf, summarize
from extract import extrair_resumo

PEDIDO_RE = re.compile(r"NRO\s+PEDIDO\s*:\s*(\d{6})", re.IGNORECASE)
CLIENTE_RE = re.compile(r"Nome\s+Cliente\s*:\s*(.+?)(?:\s{2,}|\s*-\s*[\d.\/\-]+|$)", re.IGNORECASE)
DATE_RE    = re.compile(r"Data\s+Entrega\s*:\s*(\d{2}/\d{2}/\d{4})", re.IGNORECASE)
CNPJ_RE    = re.compile(r"\s*-?\s*[\d.\/\-]{8,}\s*$")

BASE_DIR = Path(__file__).parent

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024  # 200 MB
app.config["JSON_SORT_KEYS"] = False


# ══════════════════════════════════════════════════
#  FRONTEND — serve HTML + arquivos estáticos
# ══════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    # Segurança: impede path traversal fora do diretório do projeto
    safe_path = (BASE_DIR / filename).resolve()
    if not str(safe_path).startswith(str(BASE_DIR.resolve())):
        return "Acesso negado", 403
    if safe_path.is_file():
        return send_from_directory(BASE_DIR, filename)
    return "Não encontrado", 404


# ══════════════════════════════════════════════════
#  CORS
# ══════════════════════════════════════════════════

@app.after_request
def _cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Filename"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS, GET"
    return response


# ══════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════

def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def _get_pdf_bytes():
    """
    Obtém bytes do PDF via JSON base64 (único método usado pelo frontend).
    Lê o body UMA VEZ e reutiliza.
    """
    import json as _json

    # Lê body completo de uma vez
    body = request.get_data(as_text=False)
    print(f"[get_pdf] content_type={request.content_type!r}  body_len={len(body)}")

    # Forma 1: JSON base64 (método principal do frontend)
    if body and (request.content_type or '').startswith('application/json'):
        try:
            j = _json.loads(body.decode('utf-8'))
            if "data" in j:
                b64_str = j["data"]
                # Corrige padding se necessário
                padding = 4 - len(b64_str) % 4
                if padding != 4:
                    b64_str += '=' * padding
                data = base64.b64decode(b64_str)
                name = j.get("filename", "op.pdf")
                print(f"[json b64]  decoded={len(data)} bytes  filename={name!r}")
                # Valida que começa com %PDF
                if data[:4] == b'%PDF':
                    return data, name
                else:
                    print(f"[json b64]  AVISO: não começa com %PDF, primeiros bytes: {data[:8]!r}")
                    return data, name
        except Exception as e:
            print(f"[json b64]  erro ao decodificar: {e}")

    # Forma 2: multipart
    if "pdf" in request.files:
        f = request.files["pdf"]
        data = f.read()
        name = f.filename or "op.pdf"
        print(f"[multipart] filename={name!r}  bytes={len(data)}")
        if len(data) > 0:
            return data, name

    # Forma 3: raw body PDF
    if body and len(body) > 100:
        name = request.headers.get("X-Filename", "op.pdf")
        print(f"[raw body]  bytes={len(body)}  filename={name!r}")
        return body, name

    raise ValueError(
        f"PDF vazio ou não encontrado. "
        f"content_type={request.content_type!r}  body_len={len(body)}"
    )


def _extract_meta(pdf_bytes):
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pedido = cliente = data = ""
    for page in reader.pages[:6]:
        text = page.extract_text() or ""
        if not pedido:
            m = PEDIDO_RE.search(text)
            if m:
                pedido = m.group(1)
        if not cliente:
            m = CLIENTE_RE.search(text)
            if m:
                raw = CNPJ_RE.sub("", m.group(1)).strip()
                cliente = " ".join(raw.split()[:3])
        if not data:
            m = DATE_RE.search(text)
            if m:
                data = m.group(1)
        if pedido and cliente and data:
            break
    return {"pedido": pedido, "cliente": cliente, "data": data}


# ══════════════════════════════════════════════════
#  PROCESSAR PDF
# ══════════════════════════════════════════════════

import json as _json_mod
from pathlib import Path as _Path

ESTADO_FILE = BASE_DIR / 'oem_estado.json'


@app.route("/salvar_estado", methods=["OPTIONS", "POST"])
def salvar_estado():
    if request.method == "OPTIONS":
        return "", 204
    try:
        body = request.get_data(as_text=True)
        data = _json_mod.loads(body)
        ESTADO_FILE.write_text(body, encoding='utf-8')
        print(f"[estado] Salvo: {len(body):,} bytes  pedidos={len(data.get('pedidos',[]))}")
        return jsonify({"ok": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/carregar_estado", methods=["GET"])
def carregar_estado():
    try:
        if ESTADO_FILE.exists():
            return ESTADO_FILE.read_text(encoding='utf-8'), 200, {"Content-Type": "application/json"}
        return jsonify({}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/extrair", methods=["OPTIONS", "POST"])
def extrair():
    if request.method == "OPTIONS":
        return "", 204
    try:
        pdf_bytes, filename = _get_pdf_bytes()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    try:
        resultado = extrair_resumo(pdf_bytes)
        return jsonify(resultado)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/processar", methods=["OPTIONS", "POST"])
def processar():
    if request.method == "OPTIONS":
        return "", 204

    try:
        pdf_bytes, filename = _get_pdf_bytes()
    except ValueError as e:
        print(f"[ERRO get_pdf] {e}")
        return jsonify({"error": str(e)}), 400

    print(f"[processar] {filename!r}  {len(pdf_bytes):,} bytes")

    result = {}
    org_bytes = pdf_bytes

    # 1. Metadados
    try:
        result["meta"] = _extract_meta(pdf_bytes)
    except Exception as e:
        result["meta"] = {"pedido": "", "cliente": filename, "data": ""}
        result["meta_error"] = str(e)
        print(f"[meta_error] {e}")

    pedido_id = result["meta"].get("pedido") or Path(filename).stem

    # 2. Organizar OP
    try:
        org_bytes, _, ordered_groups = reorder_pdf(pdf_bytes)
        result["op_organizado"] = {
            "filename": f"{pedido_id}.pdf",
            "data": _b64(org_bytes),
            "summary": summarize(ordered_groups),
        }
        print(f"[op_org] ok  {len(org_bytes):,} bytes")
    except Exception as e:
        traceback.print_exc()
        result["op_organizado"] = None
        result["op_error"] = str(e)
        org_bytes = pdf_bytes

    # 3. Etiquetas de modulo
    try:
        label_docs = build_label_documents(org_bytes, filename)
        result["etiquetas_modulo"] = [
            {"filename": d["file_name"], "data": _b64(d["pdf_bytes"])}
            for d in label_docs
        ]
        print(f"[modulo] {len(label_docs)} doc(s)")
    except Exception as e:
        traceback.print_exc()
        result["etiquetas_modulo"] = []
        result["modulo_error"] = str(e)

    # 4. Etiquetas de embalagem
    try:
        emb_doc = build_embalagem_document(pdf_bytes)
        result["etiqueta_embalagem"] = {
            "filename": emb_doc["file_name"],
            "data": _b64(emb_doc["pdf_bytes"]),
        }
        print(f"[embalagem] ok")
    except Exception as e:
        traceback.print_exc()
        result["etiqueta_embalagem"] = None
        result["embalagem_error"] = str(e)

    # 5. Etiquetas de corte
    try:
        corte_doc = build_corte_document(org_bytes, pedido_id)
        result["etiqueta_corte"] = {
            "filename": corte_doc["file_name"],
            "data": _b64(corte_doc["pdf_bytes"]),
        }
        print(f"[corte] ok")
    except Exception as e:
        traceback.print_exc()
        result["etiqueta_corte"] = None
        result["corte_error"] = str(e)

    return jsonify(result)


# ══════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════

if __name__ == "__main__":
    import socket

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"

    print("=" * 55)
    print("  OEM RS - Servidor em http://localhost:5050")
    print(f"  Celular (mesma rede Wi-Fi): http://{local_ip}:5050")
    print("  Mantenha esta janela aberta.")
    print("=" * 55)

    app.run(host="0.0.0.0", port=5050, debug=True, use_reloader=False)
