"""
OEM RS — Backend Flask
Processa PDF da OP: organiza, gera etiquetas de módulo e embalagem.
Serve o frontend (index.html + js/ + css/ + assets/) para acesso via celular.
"""
import base64
import io
import json as _json_mod
import os
import re
import sys
import traceback
from pathlib import Path

# Raiz do projeto (onde está server.py)
BASE_DIR = Path(__file__).resolve().parent

# Adiciona py/ ao path para importar os módulos de processamento
sys.path.insert(0, str(BASE_DIR / 'py'))
sys.path.insert(0, str(BASE_DIR))

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

# BASE_DIR já definido no topo

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024
app.config["JSON_SORT_KEYS"] = False

# Diretório para PDFs físicos (storage v2)
PDF_DIR = BASE_DIR / "data" / "pdfs"
PDF_DIR.mkdir(parents=True, exist_ok=True)


# ══════════════════════════════════════════════════
#  FRONTEND
# ══════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/favicon.ico')
def favicon():
    from flask import Response
    ico = BASE_DIR / 'assets' / 'favicon.ico'
    if ico.exists():
        return send_from_directory(str(ico.parent), 'favicon.ico', mimetype='image/x-icon')
    return Response(status=204)

@app.route('/<path:filename>')
def static_files(filename):
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
    body = request.get_data(as_text=False)
    print(f"[get_pdf] content_type={request.content_type!r}  body_len={len(body)}")

    if body and (request.content_type or '').startswith('application/json'):
        try:
            j = _json_mod.loads(body.decode('utf-8'))
            if "data" in j:
                b64_str = j["data"]
                padding = 4 - len(b64_str) % 4
                if padding != 4:
                    b64_str += '=' * padding
                data = base64.b64decode(b64_str)
                name = j.get("filename", "op.pdf")
                print(f"[json b64]  decoded={len(data)} bytes  filename={name!r}")
                return data, name
        except Exception as e:
            print(f"[json b64]  erro: {e}")

    if "pdf" in request.files:
        f = request.files["pdf"]
        data = f.read()
        name = f.filename or "op.pdf"
        if len(data) > 0:
            return data, name

    if body and len(body) > 100:
        name = request.headers.get("X-Filename", "op.pdf")
        return body, name

    raise ValueError(f"PDF vazio. content_type={request.content_type!r}  body_len={len(body)}")


def _extract_meta(pdf_bytes):
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pedido = cliente = data = ""
    for page in reader.pages[:6]:
        text = page.extract_text() or ""
        if not pedido:
            m = PEDIDO_RE.search(text)
            if m: pedido = m.group(1)
        if not cliente:
            m = CLIENTE_RE.search(text)
            if m:
                raw = CNPJ_RE.sub("", m.group(1)).strip()
                cliente = " ".join(raw.split()[:3])
        if not data:
            m = DATE_RE.search(text)
            if m: data = m.group(1)
        if pedido and cliente and data:
            break
    return {"pedido": pedido, "cliente": cliente, "data": data}


# ══════════════════════════════════════════════════
#  ESTADO
# ══════════════════════════════════════════════════

ESTADO_FILE = BASE_DIR / 'oem_estado.json'

@app.route("/salvar_estado", methods=["OPTIONS", "POST"])
def salvar_estado():
    if request.method == "OPTIONS": return "", 204
    try:
        body = request.get_data(as_text=True)
        data = _json_mod.loads(body)
        ESTADO_FILE.write_text(body, encoding='utf-8')
        print(f"[estado] Salvo: {len(body):,} bytes  pedidos={len(data.get('peds') or data.get('pedidos',[]))}")
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


# ══════════════════════════════════════════════════
#  PDFs FÍSICOS (storage v2)
# ══════════════════════════════════════════════════

@app.route("/salvar_pdf", methods=["OPTIONS", "POST"])
def salvar_pdf():
    if request.method == "OPTIONS": return "", 204
    try:
        body = request.get_json(force=True)
        filename = (body.get("filename") or "").strip()
        data_b64 = body.get("data", "")
        if not filename or not data_b64:
            return jsonify({"erro": "filename e data são obrigatórios"}), 400
        safe = ''.join(c for c in filename if c.isalnum() or c in '._-')
        if not safe:
            return jsonify({"erro": "Nome inválido"}), 400
        dest = PDF_DIR / safe
        if dest.exists():
            return jsonify({"ok": True, "cached": True})
        raw = base64.b64decode(data_b64)
        dest.write_bytes(raw)
        print(f"[pdf] salvo {safe} {len(raw)//1024}KB")
        return jsonify({"ok": True, "cached": False})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500

@app.route("/pdf/<path:filename>", methods=["GET"])
def servir_pdf(filename):
    try:
        safe = ''.join(c for c in filename if c.isalnum() or c in '._-')
        dest = PDF_DIR / safe
        if not dest.exists():
            return jsonify({"erro": "Não encontrado"}), 404
        raw = dest.read_bytes()
        return jsonify({"data": base64.b64encode(raw).decode(), "filename": safe})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# ══════════════════════════════════════════════════
#  COMPONENTES
# ══════════════════════════════════════════════════

COMPONENTS_FILE = BASE_DIR / 'db' / 'components.json'

# ══════════════════════════════════════════════════
#  LIMPAR PDFs FÍSICOS
# ══════════════════════════════════════════════════

@app.route("/limpar_pdfs", methods=["OPTIONS", "POST"])
def limpar_pdfs():
    if request.method == "OPTIONS": return "", 204
    try:
        removidos = 0
        erros = []
        for f in PDF_DIR.iterdir():
            if f.is_file():
                try:
                    f.unlink()
                    removidos += 1
                except Exception as e:
                    erros.append(str(f.name))
        print(f"[limpar_pdfs] {removidos} arquivo(s) removido(s), {len(erros)} erro(s)")
        return jsonify({"ok": True, "removidos": removidos, "erros": erros})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"erro": str(e)}), 500


# ══════════════════════════════════════════════════
#  LIMPAR DASHBOARD
# ══════════════════════════════════════════════════

@app.route("/limpar_dashboard", methods=["OPTIONS", "POST"])
def limpar_dashboard():
    if request.method == "OPTIONS": return "", 204
    try:
        zerados = []

        # report.json — preserva _meta, zera array de pedidos
        report_f = BASE_DIR / 'db' / 'report.json'
        if report_f.exists():
            try:
                atual = _json_mod.loads(report_f.read_text(encoding='utf-8'))
                meta  = atual.get('_meta', {})
            except Exception:
                meta = {}
            # Atualiza _meta para refletir o reset
            meta['total_registros'] = 0
            meta['periodo']         = ''
            vazio = {
                '_meta': meta,
                'pedidos': []
            }
            report_f.write_text(
                _json_mod.dumps(vazio, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )
            zerados.append('report.json')

        # estoque.json
        estoque_f = BASE_DIR / 'db' / 'estoque.json'
        if estoque_f.exists():
            estoque_f.write_text(
                _json_mod.dumps({'_meta': {}, 'registros': []}, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )
            zerados.append('estoque.json')

        # components.json
        comp_f = BASE_DIR / 'db' / 'components.json'
        if comp_f.exists():
            comp_f.write_text(
                _json_mod.dumps({'pedidos': {}}, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )
            zerados.append('components.json')

        print(f"[limpar_dashboard] zerado: {zerados}")
        return jsonify({'ok': True, 'zerados': zerados})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route("/salvar_components", methods=["OPTIONS", "POST"])
def salvar_components():
    if request.method == "OPTIONS": return "", 204
    try:
        body = request.get_json(force=True)
        COMPONENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        COMPONENTS_FILE.write_text(_json_mod.dumps(body, ensure_ascii=False, indent=2), encoding='utf-8')
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route("/db/components.json", methods=["GET"])
def servir_components():
    if not COMPONENTS_FILE.exists():
        return jsonify({"pedidos": {}})
    return COMPONENTS_FILE.read_text(encoding='utf-8'), 200, {"Content-Type": "application/json"}


# ══════════════════════════════════════════════════
#  ESTOQUE
# ══════════════════════════════════════════════════

ESTOQUE_FILE = BASE_DIR / 'db' / 'estoque.json'

@app.route("/salvar_estoque", methods=["OPTIONS", "POST"])
def salvar_estoque():
    if request.method == "OPTIONS": return "", 204
    try:
        dados = request.get_json()
        if not dados or 'registros' not in dados:
            return jsonify({"ok": False, "erro": "Dados inválidos"}), 400
        try:
            atual = _json_mod.loads(ESTOQUE_FILE.read_text(encoding='utf-8'))
        except Exception:
            atual = {"_meta": {}, "registros": []}
        atual['registros'] = dados['registros']
        ESTOQUE_FILE.write_text(_json_mod.dumps(atual, ensure_ascii=False, indent=2), encoding='utf-8')
        return jsonify({"ok": True, "total": len(dados['registros'])})
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 500


# ══════════════════════════════════════════════════
#  EXTRAIR + PROCESSAR
# ══════════════════════════════════════════════════

@app.route("/extrair", methods=["OPTIONS", "POST"])
def extrair():
    if request.method == "OPTIONS": return "", 204
    try:
        pdf_bytes, filename = _get_pdf_bytes()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    try:
        return jsonify(extrair_resumo(pdf_bytes))
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/processar", methods=["OPTIONS", "POST"])
def processar():
    if request.method == "OPTIONS": return "", 204

    try:
        pdf_bytes, filename = _get_pdf_bytes()
    except ValueError as e:
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

    pedido_id = result["meta"].get("pedido") or Path(filename).stem

    # 2. Organizar OP
    try:
        org_bytes, _, ordered_groups = reorder_pdf(pdf_bytes)
        result["op_organizado"] = {
            "filename": f"{pedido_id}.pdf",
            "data": _b64(org_bytes),
            "summary": summarize(ordered_groups),
        }
        # Salva fisicamente
        (PDF_DIR / f"{pedido_id}.pdf").write_bytes(org_bytes)
        print(f"[op_org] ok {len(org_bytes):,} bytes")
    except Exception as e:
        traceback.print_exc()
        result["op_organizado"] = None
        result["op_error"] = str(e)

    # 3. Etiquetas de módulo
    try:
        label_docs = build_label_documents(org_bytes, filename)
        result["etiquetas_modulo"] = [
            {"filename": d["file_name"], "data": _b64(d["pdf_bytes"])}
            for d in label_docs
        ]
        for d in label_docs:
            (PDF_DIR / d["file_name"]).write_bytes(d["pdf_bytes"])
        print(f"[modulo] {len(label_docs)} doc(s)")
    except Exception as e:
        traceback.print_exc()
        result["etiquetas_modulo"] = []
        result["modulo_error"] = str(e)

    # 4. Etiqueta de embalagem
    try:
        emb_doc = build_embalagem_document(pdf_bytes)
        result["etiqueta_embalagem"] = {
            "filename": emb_doc["file_name"],
            "data": _b64(emb_doc["pdf_bytes"]),
        }
        (PDF_DIR / emb_doc["file_name"]).write_bytes(emb_doc["pdf_bytes"])
        print(f"[embalagem] ok")
    except Exception as e:
        traceback.print_exc()
        result["etiqueta_embalagem"] = None
        result["embalagem_error"] = str(e)

    # 5. Etiqueta de corte
    try:
        corte_doc = build_corte_document(org_bytes, pedido_id)
        result["etiqueta_corte"] = {
            "filename": corte_doc["file_name"],
            "data": _b64(corte_doc["pdf_bytes"]),
        }
        (PDF_DIR / corte_doc["file_name"]).write_bytes(corte_doc["pdf_bytes"])
        print(f"[corte] ok")
    except Exception as e:
        traceback.print_exc()
        result["etiqueta_corte"] = None
        result["corte_error"] = str(e)

    return jsonify(result)


# ══════════════════════════════════════════════════
#  REPORT — registrar pedido e faturamento
# ══════════════════════════════════════════════════

REPORT_FILE = BASE_DIR / 'db' / 'report.json'

def _load_report():
    if REPORT_FILE.exists():
        try:
            return _json_mod.loads(REPORT_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {'_meta': {}, 'pedidos': []}

def _save_report(data):
    data['_meta']['total_registros'] = len(data['pedidos'])
    REPORT_FILE.write_text(
        _json_mod.dumps(data, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )


@app.route('/registrar_pedido_report', methods=['OPTIONS', 'POST'])
def registrar_pedido_report():
    """
    Recebe os bytes do PDF processado, calcula qtd de mangueiras
    (soma item_qty das páginas com corte_mm > 0) e registra no report.json.
    Body: { data: base64, filename: str, pedido: str, cliente: str,
            ano: int, mes: str, mes_nome: str }
    """
    if request.method == 'OPTIONS': return '', 204
    try:
        body     = request.get_json(force=True)
        data_b64 = body.get('data', '')
        pedido   = (body.get('pedido') or '').strip()
        cliente  = (body.get('cliente') or '').strip()
        ano      = int(body.get('ano') or 0)
        mes      = str(body.get('mes') or '').zfill(2)
        mes_nome = body.get('mes_nome', '')

        if not data_b64 or not pedido:
            return jsonify({'erro': 'data e pedido são obrigatórios'}), 400

        # Calcular qtd de mangueiras a partir das páginas do PDF
        pdf_bytes = base64.b64decode(data_b64)
        try:
            resumo   = extrair_resumo(pdf_bytes)
            paginas  = resumo.get('paginas', [])
            qtd      = sum(
                int(pg.get('item_qty') or 0)
                for pg in paginas
                if not pg.get('is_index') and (pg.get('corte_mm') or 0) > 0
            )
            # Pega cliente/data do PDF se não fornecido
            if not cliente:
                cliente = resumo.get('cliente_nome', '').split()[0]
            if not ano:
                data_str = resumo.get('data_entrega', '')
                if data_str:
                    parts = data_str.split('/')
                    if len(parts) == 3:
                        ano = int(parts[2])
                        mes = parts[1].zfill(2)
        except Exception as e:
            print(f'[report] Erro ao extrair páginas: {e}')
            qtd = 0

        # Nomes dos meses
        MESES = {
            '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril',
            '05':'Maio','06':'Junho','07':'Julho','08':'Agosto',
            '09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro'
        }
        if not mes_nome and mes:
            mes_nome = MESES.get(mes, '')

        report = _load_report()

        # Verificar se pedido já existe → atualiza qtd, preserva fat
        existente = next((p for p in report['pedidos'] if p['pedido'] == pedido), None)
        if existente:
            existente['qtd']      = qtd
            existente['cliente']  = cliente or existente['cliente']
            existente['ano']      = ano     or existente['ano']
            existente['mes']      = mes     or existente['mes']
            existente['mes_nome'] = mes_nome or existente['mes_nome']
            print(f'[report] Atualizado #{pedido}: qtd={qtd}')
        else:
            report['pedidos'].append({
                'pedido':   pedido,
                'cliente':  cliente,
                'qtd':      qtd,
                'fat':      None,   # preenchido manualmente depois
                'ano':      ano,
                'mes':      mes,
                'mes_nome': mes_nome,
            })
            print(f'[report] Adicionado #{pedido}: qtd={qtd}')

        # Ordenar por ano, mes, pedido
        report['pedidos'].sort(key=lambda p: (p.get('ano',0), p.get('mes',''), p.get('pedido','')))
        _save_report(report)

        return jsonify({'ok': True, 'pedido': pedido, 'qtd': qtd})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/atualizar_faturamento', methods=['OPTIONS', 'POST'])
def atualizar_faturamento():
    """
    Atualiza o faturamento de um pedido no report.json.
    Body: { pedido: str, fat: float | null }
    """
    if request.method == 'OPTIONS': return '', 204
    try:
        body   = request.get_json(force=True)
        pedido = (body.get('pedido') or '').strip()
        fat    = body.get('fat')  # pode ser null

        if not pedido:
            return jsonify({'erro': 'pedido é obrigatório'}), 400

        if fat is not None:
            try: fat = float(fat)
            except (ValueError, TypeError): fat = None

        report = _load_report()
        reg = next((p for p in report['pedidos'] if p['pedido'] == pedido), None)
        if not reg:
            return jsonify({'erro': f'Pedido {pedido} não encontrado no report'}), 404

        reg['fat'] = fat
        _save_report(report)
        print(f'[report] Fat #{pedido}: {fat}')
        return jsonify({'ok': True, 'pedido': pedido, 'fat': fat})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════

if __name__ == "__main__":
    import socket, shutil

    # ── Garantir logo disponível para os geradores de etiqueta ──
    # Os label_generators buscam logo_hylik.png relativo ao próprio arquivo (py/)
    # Se a logo está em assets/, copia para py/ automaticamente
    for logo_nome in ['logo_hylik.png', 'logo_H.ico']:
        src = BASE_DIR / 'assets' / logo_nome
        dst = BASE_DIR / 'py'    / logo_nome
        if src.exists() and not dst.exists():
            try:
                shutil.copy2(src, dst)
                print(f'[logo] {logo_nome} copiado para py/')
            except Exception as e:
                print(f'[logo] Erro ao copiar {logo_nome}: {e}')

    # ── Favicon: criar em assets/ se não existir ──
    favicon_dst = BASE_DIR / 'assets' / 'favicon.ico'
    favicon_ico = BASE_DIR / 'py' / 'logo_H.ico'
    if favicon_ico.exists() and not favicon_dst.exists():
        try:
            shutil.copy2(favicon_ico, favicon_dst)
            print('[favicon] logo_H.ico copiado para assets/favicon.ico')
        except Exception as e:
            print(f'[favicon] Erro: {e}')

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"

    print("=" * 55)
    print("  OEM RS - http://localhost:5050")
    print(f"  Rede local: http://{local_ip}:5050")
    print("=" * 55)

    app.run(host="0.0.0.0", port=5050, debug=True, use_reloader=False)
