"""
OEM RS — Backend Flask
Processa PDF da OP: organiza, gera etiquetas de módulo e embalagem.
"""
import base64
import io
import re
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from flask import Flask, jsonify, request

from label_corte import build_corte_document
from label_generator_embalagem_final import build_embalagem_document
from label_generator_modulo_corrigido import build_label_documents
from op_organizer import reorder_pdf, summarize

PEDIDO_RE = re.compile(r"NRO\s+PEDIDO\s*:\s*(\d{6})", re.IGNORECASE)
CLIENTE_RE = re.compile(r"Nome\s+Cliente\s*:\s*(.+?)(?:\s{2,}|\s*-\s*[\d.\/\-]+|$)", re.IGNORECASE)
DATE_RE    = re.compile(r"Data\s+Entrega\s*:\s*(\d{2}/\d{2}/\d{4})", re.IGNORECASE)
CNPJ_RE    = re.compile(r"\s*-?\s*[\d.\/\-]{8,}\s*$")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024  # 200 MB


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def _get_pdf_bytes():
    """
    Tenta obter bytes do PDF de 3 formas:
    1. multipart/form-data  (campo 'pdf')
    2. raw body (application/octet-stream)
    3. JSON base64
    """
    # Forma 1: multipart
    if "pdf" in request.files:
        f = request.files["pdf"]
        data = f.read()
        name = f.filename or "op.pdf"
        print(f"[multipart] filename={name!r}  bytes={len(data)}")
        if len(data) > 0:
            return data, name

    # Forma 2: raw body
    raw = request.get_data()
    filename_header = request.headers.get("X-Filename", "op.pdf")
    print(f"[raw body]  bytes={len(raw)}  filename={filename_header!r}")
    if len(raw) > 100:
        return raw, filename_header

    # Forma 3: JSON base64
    try:
        j = request.get_json(silent=True) or {}
        if "data" in j:
            data = base64.b64decode(j["data"])
            name = j.get("filename", "op.pdf")
            print(f"[json b64]  bytes={len(data)}  filename={name!r}")
            if len(data) > 0:
                return data, name
    except Exception:
        pass

    raise ValueError(
        f"PDF vazio ou nao encontrado. "
        f"Content-Type={request.content_type!r}  "
        f"files={list(request.files.keys())}  "
        f"raw_len={len(request.get_data(as_text=False))}"
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


@app.after_request
def _cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Filename"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


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


if __name__ == "__main__":
    import threading, webbrowser, pathlib, time

    html_path = pathlib.Path(__file__).parent / "oem_rs.html"

    def _open_browser():
        time.sleep(1.2)
        webbrowser.open(html_path.as_uri())

    threading.Thread(target=_open_browser, daemon=True).start()

    print("=" * 55)
    print("  OEM RS - Servidor em http://localhost:5050")
    print("  Abrindo oem_rs.html automaticamente...")
    print("  Mantenha esta janela aberta.")
    print("=" * 55)
    app.run(host="0.0.0.0", port=5050, debug=True, use_reloader=False)
