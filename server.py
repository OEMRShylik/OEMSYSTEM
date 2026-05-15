# ══════════════════════════════════════════════════
#  py/server.py  —  OEM RS  (Flask)
#  Porta 5050  |  Serve o front-end + processa PDFs
# ══════════════════════════════════════════════════
import os, json, base64, traceback
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, Response

# ── Diretórios ──────────────────────────────────
# server.py fica na RAIZ do projeto (nao em py/)
# BASE = mesma pasta do server.py
BASE  = Path(__file__).resolve().parent    # .../projeto/

DATA    = BASE / 'data'
PDF_DIR = DATA / 'pdfs'
STATE_F = DATA / 'oem_estado.json'

DATA.mkdir(parents=True, exist_ok=True)
PDF_DIR.mkdir(parents=True, exist_ok=True)

# Imprime o caminho na inicializacao para diagnostico
print(f"[OEM] BASE = {BASE}")
print(f"[OEM] index.html existe: {(BASE / 'index.html').exists()}")

app = Flask(__name__, static_folder=str(BASE), static_url_path='')


# ── Página principal ──────────────────────────────
@app.route('/')
def index():
    if not (BASE / 'index.html').exists():
        return f"index.html nao encontrado em: {BASE}", 500
    return send_from_directory(str(BASE), 'index.html')


# ── Favicon: evita 404 no console ────────────────
@app.route('/favicon.ico')
def favicon():
    ico = BASE / 'assets' / 'favicon.ico'
    if ico.exists():
        return send_from_directory(str(ico.parent), 'favicon.ico',
                                   mimetype='image/x-icon')
    return Response(status=204)


# ══════════════════════════════════════════════════
#  ESTADO DE NEGÓCIO  (apenas metadados, sem PDFs)
# ══════════════════════════════════════════════════

@app.route('/salvar_estado', methods=['POST'])
def salvar_estado():
    try:
        body = request.get_json(force=True)
        if not body:
            return jsonify({'erro': 'Corpo vazio'}), 400
        STATE_F.write_text(json.dumps(body, ensure_ascii=False, indent=None),
                           encoding='utf-8')
        kb = STATE_F.stat().st_size / 1024
        print(f'[estado] salvo  {kb:.1f} KB')
        return jsonify({'ok': True, 'kb': round(kb, 1)})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/carregar_estado', methods=['GET'])
def carregar_estado():
    if not STATE_F.exists():
        return jsonify({}), 200
    try:
        data = json.loads(STATE_F.read_text(encoding='utf-8'))
        return jsonify(data)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  PDFs FÍSICOS
#  POST /salvar_pdf  { filename, data: base64 }
#  GET  /pdf/<filename>  → { data: base64 }
# ══════════════════════════════════════════════════

@app.route('/salvar_pdf', methods=['POST'])
def salvar_pdf():
    try:
        body = request.get_json(force=True)
        filename = body.get('filename', '').strip()
        data_b64 = body.get('data', '')

        if not filename or not data_b64:
            return jsonify({'erro': 'filename e data são obrigatórios'}), 400

        # Sanitiza nome de arquivo: só alfanumérico, ponto, underscore, hífen
        safe_name = ''.join(c for c in filename if c.isalnum() or c in '._-')
        if not safe_name:
            return jsonify({'erro': 'Nome de arquivo inválido'}), 400

        dest = PDF_DIR / safe_name

        # Não sobrescreve se já existe (economiza disco e I/O)
        if dest.exists():
            return jsonify({'ok': True, 'cached': True, 'kb': round(dest.stat().st_size / 1024, 1)})

        raw = base64.b64decode(data_b64)
        dest.write_bytes(raw)
        kb = len(raw) / 1024
        print(f'[pdf] salvo  {safe_name}  {kb:.0f} KB')
        return jsonify({'ok': True, 'cached': False, 'kb': round(kb, 1)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/pdf/<path:filename>', methods=['GET'])
def servir_pdf(filename):
    """Retorna o PDF como base64 JSON para o front-end."""
    try:
        safe_name = ''.join(c for c in filename if c.isalnum() or c in '._-')
        dest = PDF_DIR / safe_name

        if not dest.exists():
            return jsonify({'erro': 'Arquivo não encontrado'}), 404

        raw  = dest.read_bytes()
        b64  = base64.b64encode(raw).decode('ascii')
        kb   = len(raw) / 1024
        print(f'[pdf] servido  {safe_name}  {kb:.0f} KB')
        return jsonify({'data': b64, 'filename': safe_name, 'kb': round(kb, 1)})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  PROCESSAR PDF (OP → reorganização + etiquetas)
# ══════════════════════════════════════════════════

@app.route('/processar', methods=['POST'])
def processar():
    try:
        body     = request.get_json(force=True)
        data_b64 = body.get('data', '')
        filename = body.get('filename', 'op.pdf')

        if not data_b64:
            return jsonify({'erro': 'data vazio'}), 400

        raw = base64.b64decode(data_b64)
        resultado = {}

        # Metadados básicos do PDF
        try:
            from py.extract import extrair_meta
            resultado['meta'] = extrair_meta(raw)
        except Exception as e:
            resultado['meta_error'] = str(e)
            resultado['meta'] = {}

        # OP reorganizada
        try:
            from py.op_organizer import organizar_op
            op_raw  = organizar_op(raw)
            op_b64  = base64.b64encode(op_raw).decode('ascii')
            num     = resultado.get('meta', {}).get('pedido', 'OP')
            op_name = f'{num}.pdf'
            # Salva automaticamente no servidor
            (PDF_DIR / op_name).write_bytes(op_raw)
            resultado['op_organizado'] = {'filename': op_name, 'data': op_b64}
        except Exception as e:
            resultado['op_error'] = str(e)

        # Etiquetas de módulo (kits)
        try:
            from py.label_generator_modulo_corrigido import gerar_etiquetas_modulo
            etiquetas = gerar_etiquetas_modulo(raw)
            resultado['etiquetas_modulo'] = []
            num = resultado.get('meta', {}).get('pedido', 'KIT')
            for i, et_raw in enumerate(etiquetas):
                et_b64 = base64.b64encode(et_raw).decode('ascii')
                et_name = f'KIT_{i+1}_{num}.pdf'
                (PDF_DIR / et_name).write_bytes(et_raw)
                resultado['etiquetas_modulo'].append({'filename': et_name, 'data': et_b64})
        except Exception as e:
            resultado['modulo_error'] = str(e)

        # Etiqueta de embalagem
        try:
            from py.label_generator_embalagem_final import gerar_embalagem
            emb_raw  = gerar_embalagem(raw)
            emb_b64  = base64.b64encode(emb_raw).decode('ascii')
            num      = resultado.get('meta', {}).get('pedido', 'EMBALAGEM')
            emb_name = f'EMBALAGEM_{num}.pdf'
            (PDF_DIR / emb_name).write_bytes(emb_raw)
            resultado['etiqueta_embalagem'] = {'filename': emb_name, 'data': emb_b64}
        except Exception as e:
            resultado['embalagem_error'] = str(e)

        # Etiqueta de corte
        try:
            from py.label_corte import gerar_etiqueta_corte
            crt_raw  = gerar_etiqueta_corte(raw)
            crt_b64  = base64.b64encode(crt_raw).decode('ascii')
            num      = resultado.get('meta', {}).get('pedido', 'CORTE')
            crt_name = f'CORTE_{num}.pdf'
            (PDF_DIR / crt_name).write_bytes(crt_raw)
            resultado['etiqueta_corte'] = {'filename': crt_name, 'data': crt_b64}
        except Exception as e:
            resultado['corte_error'] = str(e)

        return jsonify(resultado)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  EXTRAIR DADOS DO PDF
# ══════════════════════════════════════════════════

@app.route('/extrair', methods=['POST'])
def extrair():
    try:
        body     = request.get_json(force=True)
        data_b64 = body.get('data', '')
        if not data_b64:
            return jsonify({'erro': 'data vazio'}), 400
        raw = base64.b64decode(data_b64)
        try:
            from py.extract import extrair_paginas
            paginas = extrair_paginas(raw)
        except Exception as e:
            paginas = []
            print(f'[extrair] erro: {e}')
        return jsonify({'paginas': paginas})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  COMPONENTES
# ══════════════════════════════════════════════════

COMPONENTS_F = DATA / 'components.json'

@app.route('/salvar_components', methods=['POST'])
def salvar_components():
    try:
        body = request.get_json(force=True)
        if not COMPONENTS_F.parent.exists():
            COMPONENTS_F.parent.mkdir(parents=True, exist_ok=True)
        COMPONENTS_F.write_text(
            json.dumps(body, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        return jsonify({'ok': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


@app.route('/db/components.json', methods=['GET'])
def servir_components():
    if not COMPONENTS_F.exists():
        return jsonify({'pedidos': {}})
    try:
        return jsonify(json.loads(COMPONENTS_F.read_text(encoding='utf-8')))
    except Exception as e:
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  ESTOQUE
# ══════════════════════════════════════════════════

ESTOQUE_F = DATA / 'estoque.json'

@app.route('/salvar_estoque', methods=['POST'])
def salvar_estoque():
    try:
        body = request.get_json(force=True)
        ESTOQUE_F.write_text(json.dumps(body, ensure_ascii=False, indent=2),
                             encoding='utf-8')
        return jsonify({'ok': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


# ══════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════

if __name__ == '__main__':
    print('=' * 48)
    print('  OEM System  |  http://localhost:5050')
    print(f'  Raiz:   {BASE}')
    print(f'  PDFs:   {PDF_DIR}')
    print(f'  Estado: {STATE_F}')
    print('=' * 48)
    app.run(host='0.0.0.0', port=5050, debug=False, threaded=True)
