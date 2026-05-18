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

@app.route('/gerar_relatorio', methods=['POST', 'OPTIONS'])
def gerar_relatorio():
    if request.method == 'OPTIONS': return '', 204
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.colors import HexColor, black, white
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.units import mm
        from datetime import datetime, timezone, timedelta
        import re as _re

        body      = request.get_json(force=True)
        pedido    = body.get('pedido', '')
        cliente   = body.get('cliente', '')
        entrega   = body.get('entrega', '')
        paginas   = body.get('paginas', [])
        amost_db  = body.get('amostragens', {})
        checklist  = body.get('checklist_inspecao') or {}
        ts_etapas    = body.get('ts_etapas') or {}
        laudos       = body.get('laudos') or []
        fotos_emb    = body.get('fotos_embalagem') or []

        BRT = timezone(timedelta(hours=-3))

        def fmt_dt(iso):
            if not iso: return '—', '—'
            try:
                dt = datetime.fromisoformat(iso.replace('Z', '+00:00')).astimezone(BRT)
                return dt.strftime('%d/%m/%Y'), dt.strftime('%H:%M')
            except Exception:
                return str(iso)[:10], str(iso)[11:16]

        buf = io.BytesIO()
        W, H = A4

        c = rl_canvas.Canvas(buf, pagesize=A4)

        BLUE  = HexColor('#1a56db')
        GREEN = HexColor('#059669')
        RED   = HexColor('#dc2626')
        GRAY  = HexColor('#6b7280')
        LGRAY = HexColor('#f3f4f6')
        DGRAY = HexColor('#374151')
        MONO  = 'Courier'
        SANS  = 'Helvetica'

        logo_path = None
        for lp in [BASE_DIR / 'assets' / 'logo_hylik.png', BASE_DIR / 'py' / 'logo_hylik.png']:
            if lp.exists():
                logo_path = str(lp)
                break

        def draw_header(c, pedido, cliente, entrega, pagina_num, total_pags):
            c.setFillColor(BLUE)
            c.rect(0, H - 52, W, 52, fill=1, stroke=0)
            if logo_path:
                try:
                    c.drawImage(logo_path, 14*mm, H - 44, width=30*mm, height=18*mm,
                                preserveAspectRatio=True, mask='auto')
                except Exception:
                    pass
            c.setFillColor(white)
            c.setFont(SANS + '-Bold', 13)
            c.drawString(52*mm, H - 22, f'Relatório de Produção  —  Pedido #{pedido}')
            c.setFont(SANS, 9)
            c.drawString(52*mm, H - 34, f'Cliente: {cliente}   |   Entrega: {entrega}')
            c.setFont(SANS, 8)
            c.drawRightString(W - 12*mm, H - 22, f'Página {pagina_num} / {total_pags}')

        # ── Página 1: Checklist de Inspeção ──────────────────────────────────
        def draw_checklist_page(c):
            draw_header(c, pedido, cliente, entrega, 1, '—')
            y = H - 68

            # Título
            c.setFillColor(GREEN)
            c.rect(12*mm, y - 4, W - 24*mm, 20, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont(SANS + '-Bold', 11)
            c.drawCentredString(W / 2, y + 5, 'CHECKLIST DE INSPEÇÃO')
            y -= 28

            # Info geral
            data_ini, hora_ini = fmt_dt(checklist.get('ts_inicio'))
            data_fim, hora_fim = fmt_dt(checklist.get('ts_fim'))
            usuario = checklist.get('usuario') or '—'
            operadores = checklist.get('operadores') or {}

            info_rows = [
                ('Operador responsável', usuario),
                ('Início da inspeção', f'{data_ini}  {hora_ini}'),
                ('Fim da inspeção',    f'{data_fim}  {hora_fim}'),
            ]
            c.setFillColor(LGRAY)
            c.rect(12*mm, y - len(info_rows)*14 - 4, W - 24*mm, len(info_rows)*14 + 6, fill=1, stroke=0)
            for label, val in info_rows:
                c.setFillColor(DGRAY)
                c.setFont(SANS + '-Bold', 8.5)
                c.drawString(15*mm, y, label + ':')
                c.setFont(SANS, 8.5)
                c.drawString(75*mm, y, val)
                y -= 14
            y -= 10

            # Tabela do checklist
            GRUPOS = [
                ('TERMINAL', [
                    'CONEXÕES SEM OXIDAÇÃO',
                    'TERMINAIS SEM OBSTRUÇÃO',
                    'CHAVE DO SEXTAVADO IGUAL PARA TODO O KIT',
                    'DIÂMETRO DA ROSCA CONFORME TABELA',
                    'VEDAÇÃO DA ROSCA',
                    'TERMINAL GIRATÓRIO DESTRAVADO',
                    'DIÂMETRO DA ESPIGA CONFORME DIÂMETRO DA MANGUEIRA',
                    "PRESENÇA DO ANEL O'RING/ANEL DE VEDAÇÃO, DUREZA E MEDIDAS CONFORMES",
                ]),
                ('CAPA', [
                    'CAPAS SEM OXIDAÇÃO',
                    'GRAVAÇÃO DAS CAPAS COM LOTE/CÓDIGO',
                    'CAPAS COM GARRAS',
                    'CAPA INTEGRAS EM TODO SEU CORPO',
                ]),
                ('CONJUNTO', [
                    'KIT CONFORME PEDIDO',
                    'ETIQUETA ADESIVA NA EMBALAGEM DO KIT',
                    'QUANTIDADE INSPECIONADA CONFORME ORDEM',
                ]),
                ('EMBALAGEM', [
                    'CÓDIGO/NOME DO CLIENTE',
                    'COMPONENTES CORRESPONDENTE COM A DESCRIÇÃO DO ITEM',
                ]),
            ]
            itens_cl = checklist.get('itens') or {}

            row_h = 13
            col_c    = W - 72*mm
            col_nc   = W - 61*mm
            col_na   = W - 50*mm
            col_ins  = W - 37*mm

            # Cabeçalho da tabela
            c.setFillColor(BLUE)
            c.rect(12*mm, y - row_h, W - 24*mm, row_h, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont(SANS + '-Bold', 7.5)
            c.drawString(15*mm, y - 9, 'GRUPO')
            c.drawString(35*mm, y - 9, 'REQUISITO')
            c.drawCentredString(col_c,  y - 9, 'C')
            c.drawCentredString(col_nc, y - 9, 'NC')
            c.drawCentredString(col_na, y - 9, 'NA')
            c.drawCentredString(col_ins, y - 9, 'RESPONSÁVEL')
            y -= row_h

            for grupo, itens in GRUPOS:
                insp = operadores.get(grupo, '—')
                y_grupo_start = y  # salva topo do grupo para desenhar label depois

                for gi, item in enumerate(itens):
                    val = itens_cl.get(item, '')
                    bg = HexColor('#f9fafb') if gi % 2 == 0 else white
                    c.setFillColor(bg)
                    c.rect(12*mm, y - row_h + 2, W - 24*mm, row_h, fill=1, stroke=0)

                    c.setFillColor(DGRAY)
                    c.setFont(SANS, 7)
                    txt = item if len(item) <= 60 else item[:57] + '…'
                    c.drawString(35*mm, y - 8, txt)

                    # Status
                    cor_map = {'C': GREEN, 'NC': RED, 'NA': GRAY}
                    for v, cx in [('C', col_c), ('NC', col_nc), ('NA', col_na)]:
                        if val == v:
                            c.setFillColor(cor_map[v])
                            c.circle(cx, y - 6, 4, fill=1, stroke=0)
                        else:
                            c.setStrokeColor(HexColor('#d1d5db'))
                            c.setLineWidth(0.5)
                            c.circle(cx, y - 6, 4, fill=0, stroke=1)

                    y -= row_h
                    if y < 30*mm:
                        c.showPage()
                        draw_header(c, pedido, cliente, entrega, '—', '—')
                        y = H - 68

                # Desenha label do grupo e inspetor APÓS todos os backgrounds do grupo
                gy = y_grupo_start - 8 - row_h * (len(itens) - 1) / 2
                if gy > 20*mm:
                    c.setFillColor(DGRAY)
                    c.setFont(SANS + '-Bold', 7)
                    c.drawString(13*mm, gy, grupo)
                    c.setFont(SANS, 6)
                    c.drawCentredString(col_ins, gy, insp)

                # Linha separadora entre grupos
                c.setStrokeColor(HexColor('#e5e7eb'))
                c.setLineWidth(0.5)
                c.line(12*mm, y + 2, W - 12*mm, y + 2)

            c.showPage()

        # ── Item box ─────────────────────────────────────────────────────────
        def draw_item_box(c, pg):
            y_top = H - 75

            item_code = pg.get('item_codigo') or '—'
            item_qty  = pg.get('item_qty')
            descricao = _re.sub(r'^QUANTIDADE\s*:\s*[\d.,]+\s*', '',
                                (pg.get('descricao') or ''), flags=_re.IGNORECASE).strip()
            corte_mm  = pg.get('corte_mm')
            is_index  = pg.get('is_index', False)
            lista     = pg.get('lista_itens') or []

            corte_fmt = ''
            if corte_mm and not is_index:
                corte_fmt = f'{float(corte_mm):,.7f}'.replace(',', 'X').replace('.', ',').replace('X', '.')

            info_fields = []
            for lbl, key in [
                ('Tipo de Corte',        'tipo_corte'),
                ('Angulo de Montagem',   'angulo'),
                ('Embalagem Individual', 'embalagem'),
                ('Forma de Embalagem',   'forma_emb'),
                ('Gravacao Capa',        'gravacao'),
                ('ID Extra',             'id_extra'),
                ('OBS',                  'obs'),
            ]:
                val = pg.get(key, '') or ''
                if key == 'id_extra':
                    # Ignora se o regex capturou erroneamente "OBS" ou "OBS :"
                    if _re.match(r'^OBS\s*:?\s*$', val, _re.IGNORECASE):
                        val = ''
                if key == 'obs':
                    val = _re.sub(r'Total\s+de\s+PIS\s*:\s*\d+', '', val, flags=_re.IGNORECASE)
                    val = _re.sub(r'Aten[çc][aã]o[!.]*', '', val, flags=_re.IGNORECASE)
                    val = val.strip()
                if val:
                    info_fields.append((lbl, val))

            row_h  = 13
            trow_h = 14

            n_hdr    = 1 + (1 if descricao else 0) + (1 if corte_fmt else 0)
            sec_hdr  = n_hdr * row_h + 14
            sec_tbl  = (len(lista) + 1) * trow_h + 6 if lista else 0
            sec_sep  = 8
            # Pré-calcula linhas de cada campo (quebra de linha automática)
            _info_font_size = 9
            _val_max_w = (W - 24*mm) - 65*mm - 4  # largura disponível para o valor
            def _split_val(text):
                words = str(text).split()
                lines, cur = [], ''
                for w in words:
                    test = (cur + ' ' + w).strip()
                    if c.stringWidth(test, SANS, _info_font_size) <= _val_max_w:
                        cur = test
                    else:
                        if cur: lines.append(cur)
                        cur = w
                if cur: lines.append(cur)
                return lines or ['']
            info_lines = [(_l, _v, _split_val(_v)) for _l, _v in info_fields]
            _total_info_rows = sum(len(ls) for _, _, ls in info_lines)
            sec_info = (15 + _total_info_rows * 13) if info_lines else 0
            total_h  = sec_hdr + sec_tbl + sec_sep + sec_info + 4

            bx = 12*mm
            bw = W - 24*mm
            by = y_top - total_h

            # Fundo branco + cabeçalho cinza
            c.setFillColor(white)
            c.roundRect(bx, by, bw, total_h, 4, fill=1, stroke=0)
            c.setFillColor(LGRAY)
            c.rect(bx, y_top - sec_hdr, bw, sec_hdr, fill=1, stroke=0)

            y = y_top - 8

            # ITEM A PRODUZIR | QUANTIDADE
            c.setFillColor(DGRAY)
            c.setFont(SANS + '-Bold', 9.5)
            c.drawString(15*mm, y, f'ITEM A PRODUZIR:  {item_code}')
            if item_qty is not None:
                c.drawRightString(W - 15*mm, y, f'QUANTIDADE:  {float(item_qty):.2f}')
            y -= row_h

            # Descrição
            if descricao:
                c.setFont(SANS, 8.5)
                c.setFillColor(HexColor('#1f2937'))
                if len(descricao) > 100: descricao = descricao[:97] + '…'
                c.drawString(15*mm, y, descricao)
                y -= row_h

            # Tamanho de Corte
            if corte_fmt:
                c.setFillColor(HexColor('#991b1b'))
                lbl_corte = 'TAMANHO DE CORTE (Em Milimetros):  '
                c.setFont(SANS + '-Bold', 8.5)
                lbl_w = c.stringWidth(lbl_corte, SANS + '-Bold', 8.5)
                c.drawString(15*mm, y, lbl_corte)
                c.setFont(SANS + '-Bold', 9.8)
                c.drawString(15*mm + lbl_w, y, corte_fmt)
                c.setFillColor(DGRAY)
                y -= row_h

            y -= 4

            # ── Tabela de componentes ─────────────────────────────────────────
            if lista:
                cx = [15*mm, 42*mm, 59*mm, 90*mm]

                # Cabeçalho da tabela
                c.setFillColor(HexColor('#e5e7eb'))
                c.rect(bx, y - trow_h + 3, bw, trow_h, fill=1, stroke=0)
                c.setFillColor(DGRAY)
                c.setFont(SANS + '-Bold', 9)
                c.drawString(cx[0], y - 5, 'QTD')
                c.drawString(cx[1], y - 5, 'UN')
                c.drawString(cx[2], y - 5, 'CÓDIGO')
                c.drawString(cx[3], y - 5, 'DESCRIÇÃO')
                y -= trow_h

                for ri, it in enumerate(lista):
                    bg = white if ri % 2 == 0 else HexColor('#f9fafb')
                    c.setFillColor(bg)
                    c.rect(bx, y - trow_h + 3, bw, trow_h, fill=1, stroke=0)
                    c.setFillColor(DGRAY)
                    qty_s = f"{float(it.get('quantidade') or 0):.6f}" if it.get('quantidade') is not None else ''
                    c.setFont(MONO, 9)
                    c.drawString(cx[0], y - 5, qty_s)
                    c.setFont(SANS, 9)
                    c.drawString(cx[1], y - 5, str(it.get('unidade', '')))
                    c.setFont(MONO, 9)
                    c.drawString(cx[2], y - 5, str(it.get('codigo', '')))
                    c.setFont(SANS, 9)
                    d = str(it.get('descricao', ''))
                    if len(d) > 52: d = d[:49] + '…'
                    c.drawString(cx[3], y - 5, d)
                    y -= trow_h

                # Borda da tabela
                c.setStrokeColor(HexColor('#d1d5db'))
                c.setLineWidth(0.4)
                c.rect(bx, y + 3, bw, trow_h * (len(lista) + 1), fill=0, stroke=1)
                y -= 2

            # ── Separador ────────────────────────────────────────────────────
            c.setStrokeColor(HexColor('#d1d5db'))
            c.setLineWidth(0.5)
            c.line(bx, y, bx + bw, y)
            y -= 6

            # ── INFORMAÇÃO PRODUTO (REGISTRO MESTRE) ─────────────────────────
            if info_lines:
                c.setFont(SANS + '-Bold', 10)
                c.setFillColor(DGRAY)
                c.drawString(15*mm, y, 'INFORMAÇÃO PRODUTO (REGISTRO MESTRE):')
                y -= 13
                for lbl, val, val_lines in info_lines:
                    c.setFont(SANS, _info_font_size)
                    c.setFillColor(HexColor('#6b7280'))
                    c.drawString(15*mm, y, f'{lbl} :')
                    c.setFillColor(DGRAY)
                    for li, line in enumerate(val_lines):
                        c.drawString(75*mm, y, line)
                        if li < len(val_lines) - 1:
                            y -= 13
                    y -= 13

            # Borda externa (por cima de tudo)
            c.setStrokeColor(HexColor('#d1d5db'))
            c.setLineWidth(0.6)
            c.roundRect(bx, by, bw, total_h, 4, fill=0, stroke=1)

            return y - 4

        # ── Amostragens ───────────────────────────────────────────────────────
        def draw_amostragens(c, amost, y_start):
            if not amost or not amost.get('amostras'):
                c.setFillColor(GRAY)
                c.setFont(SANS, 9)
                c.drawString(12*mm, y_start - 14, 'Sem amostragens registradas.')
                return
            amostras = amost['amostras']
            c.setFillColor(DGRAY)
            c.setFont(SANS + '-Bold', 12)
            c.drawString(12*mm, y_start - 12, 'Amostragens')
            y = y_start - 32
            headers = ['#', 'Corte (mm)', 'Prensagem (mm)', 'Conf./Embalagem']
            x_cols  = [12*mm, 26*mm, 78*mm, 130*mm]
            row_h   = 16
            c.setFillColor(BLUE)
            c.rect(12*mm, y - 2, W - 24*mm, row_h, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont(SANS + '-Bold', 10)
            for i, h in enumerate(headers):
                c.drawString(x_cols[i] + 2, y + 4, h)
            y -= row_h
            for ri, am in enumerate(amostras):
                c.setFillColor(HexColor('#f9fafb') if ri % 2 == 0 else white)
                c.rect(12*mm, y - 2, W - 24*mm, row_h, fill=1, stroke=0)
                c.setFillColor(DGRAY)
                c.setFont(MONO, 10)
                c.drawString(x_cols[0] + 2, y + 4, str(ri + 1))
                c.drawString(x_cols[1] + 2, y + 4, am.get('corte', '') or '—')
                c.drawString(x_cols[2] + 2, y + 4, am.get('prensagem', '') or '—')
                c.drawString(x_cols[3] + 2, y + 4, am.get('conferencia', '') or '—')
                y -= row_h
            table_h = row_h * (len(amostras) + 1)
            c.setStrokeColor(HexColor('#e5e7eb'))
            c.setLineWidth(0.5)
            c.rect(12*mm, y, W - 24*mm, table_h + 2, fill=0, stroke=1)

            # Operadores e timestamps por processo
            op_corte = amost.get('operador_corte', '')
            op_prens = amost.get('operador_prensagem', '')
            op_conf  = amost.get('operador_conferencia', '')
            op_geral = amost.get('operador', '')

            procs = [
                ('Corte',        op_corte, 'corte'),
                ('Prensagem',    op_prens, 'prensagem'),
                ('Conferência',  op_conf,  'embalagem'),
            ]
            has_proc = any(op or ts_etapas.get(k + '_inicio') for _, op, k in procs)

            y_op = y - 8
            if not has_proc:
                # Fallback: operador geral
                if op_geral:
                    c.setFont(SANS + '-Bold', 9)
                    c.setFillColor(GREEN)
                    c.drawString(12*mm, y_op, f'Operador: {op_geral}')
            else:
                # Tabela compacta por processo
                fp_h = 14
                # Cabeçalho
                c.setFillColor(HexColor('#f3f4f6'))
                c.rect(12*mm, y_op - 2, W - 24*mm, fp_h, fill=1, stroke=0)
                c.setFont(SANS + '-Bold', 8)
                c.setFillColor(DGRAY)
                c.drawString(14*mm, y_op + 3,   'PROCESSO')
                c.drawString(45*mm, y_op + 3,   'OPERADOR')
                c.drawString(103*mm, y_op + 3,  'INÍCIO')
                c.drawString(148*mm, y_op + 3,  'FIM')
                y_op -= fp_h

                for label, operador, key in procs:
                    ini_d, ini_h = fmt_dt(ts_etapas.get(key + '_inicio'))
                    fim_d, fim_h = fmt_dt(ts_etapas.get(key + '_fim'))
                    if not operador and ini_d == '—':
                        continue
                    c.setFillColor(white)
                    c.rect(12*mm, y_op - 2, W - 24*mm, fp_h, fill=1, stroke=0)
                    c.setFont(SANS + '-Bold', 8)
                    c.setFillColor(GREEN)
                    c.drawString(14*mm, y_op + 3, label)
                    c.setFont(SANS + '-Bold', 9)
                    c.setFillColor(DGRAY)
                    c.drawString(45*mm,  y_op + 3, operador or '—')
                    c.setFont(SANS, 8)
                    c.drawString(103*mm, y_op + 3, f'{ini_d}  {ini_h}' if ini_d != '—' else '—')
                    c.drawString(148*mm, y_op + 3, f'{fim_d}  {fim_h}' if fim_d != '—' else '—')
                    y_op -= fp_h

                # Borda da tabela de processos
                rows_drawn = sum(1 for _, op, k in procs
                                 if op or ts_etapas.get(k + '_inicio'))
                if rows_drawn:
                    total_h = fp_h * (rows_drawn + 1) + 2
                    c.setStrokeColor(HexColor('#e5e7eb'))
                    c.setLineWidth(0.5)
                    c.rect(12*mm, y_op - 2, W - 24*mm, total_h, fill=0, stroke=1)

        # ── Monta o PDF ───────────────────────────────────────────────────────
        itens = paginas if paginas else []
        total_item_pags = len(itens) if itens else 1

        # Página 1: checklist (se existir)
        if checklist:
            draw_checklist_page(c)

        if not itens:
            draw_header(c, pedido, cliente, entrega, 1, 1)
            c.setFont(SANS, 12)
            c.drawCentredString(W/2, H/2, 'Nenhum item encontrado neste pedido.')
            c.showPage()
        else:
            offset = 2 if checklist else 1
            for i, pg in enumerate(itens):
                pg_idx_str = str(i)
                amost = amost_db.get(pg_idx_str) or amost_db.get(int(pg_idx_str) if pg_idx_str.isdigit() else -1)
                draw_header(c, pedido, cliente, entrega, i + offset, total_item_pags + offset - 1)
                y_after_item = draw_item_box(c, pg)
                is_idx = pg.get('is_index', False)
                has_real_item = bool(pg.get('item_codigo')) or (pg.get('corte_mm') or 0) > 0
                if not is_idx and has_real_item:
                    draw_amostragens(c, amost, y_after_item - 8)
                elif is_idx:
                    c.setFillColor(HexColor('#6b7280'))
                    c.setFont(SANS, 8)
                    c.drawString(15*mm, y_after_item - 14, '— Página de índice / Kit —')
                c.showPage()

        c.save()
        report_bytes = buf.getvalue()

        # ── Anexa laudos de teste ─────────────────────────────────────────────
        if laudos:
            try:
                try:
                    from pypdf import PdfWriter, PdfReader
                except ImportError:
                    from PyPDF2 import PdfWriter, PdfReader
                writer = PdfWriter()
                for page in PdfReader(io.BytesIO(report_bytes)).pages:
                    writer.add_page(page)
                for laudo in laudos:
                    raw = laudo.get('data', '')
                    pad = 4 - len(raw) % 4
                    lbytes = base64.b64decode(raw + ('=' * pad if pad != 4 else ''))
                    for page in PdfReader(io.BytesIO(lbytes)).pages:
                        writer.add_page(page)
                merged = io.BytesIO()
                writer.write(merged)
                report_bytes = merged.getvalue()
            except Exception as e_merge:
                print(f'[relatorio] merge laudos: {e_merge}')

        # ── Anexa fotos de embalagem ──────────────────────────────────────────
        if fotos_emb:
            try:
                try:
                    from pypdf import PdfWriter, PdfReader
                except ImportError:
                    from PyPDF2 import PdfWriter, PdfReader
                from reportlab.lib.pagesizes import A4 as _A4, landscape as _landscape
                from reportlab.pdfgen import canvas as _rc
                from reportlab.lib.units import mm as _mm

                writer_f = PdfWriter()
                for page in PdfReader(io.BytesIO(report_bytes)).pages:
                    writer_f.add_page(page)

                _PAGE_LAND = _landscape(_A4)
                for foto_fn in fotos_emb:
                    safe_f = ''.join(c for c in foto_fn if c.isalnum() or c in '._-')
                    foto_path = FOTOS_DIR / safe_f
                    if not foto_path.exists():
                        continue
                    Wf, Hf = _PAGE_LAND
                    foto_buf = io.BytesIO()
                    cf = _rc.Canvas(foto_buf, pagesize=_PAGE_LAND)
                    cf.setFont('Helvetica-Bold', 11)
                    cf.drawCentredString(Wf / 2, Hf - 12 * _mm, f'Registro Fotográfico — {safe_f}')
                    margin = 12 * _mm
                    cf.drawImage(str(foto_path), margin, margin,
                                 Wf - 2 * margin, Hf - 2 * margin - 18 * _mm,
                                 preserveAspectRatio=True, anchor='c')
                    cf.showPage()
                    cf.save()
                    for page in PdfReader(io.BytesIO(foto_buf.getvalue())).pages:
                        writer_f.add_page(page)

                merged_f = io.BytesIO()
                writer_f.write(merged_f)
                report_bytes = merged_f.getvalue()
            except Exception as e_fotos:
                print(f'[relatorio] fotos embalagem: {e_fotos}')

        pdf_b64 = base64.b64encode(report_bytes).decode()
        return jsonify({'ok': True, 'pdf': pdf_b64})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'erro': str(e)}), 500


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

ESTADO_FILE   = BASE_DIR / 'oem_estado.json'
USUARIOS_FILE = BASE_DIR / 'oem_usuarios.json'
FOTOS_DIR     = BASE_DIR / 'fotos'
FOTOS_DIR.mkdir(exist_ok=True)

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
#  FOTOS DE EMBALAGEM
# ══════════════════════════════════════════════════

@app.route('/salvar_foto', methods=['OPTIONS', 'POST'])
def salvar_foto():
    if request.method == 'OPTIONS': return '', 204
    try:
        body = request.get_json(force=True)
        filename = (body.get('filename') or '').strip()
        data_b64 = body.get('data', '')
        if not filename or not data_b64:
            return jsonify({'erro': 'filename e data são obrigatórios'}), 400
        safe = ''.join(c for c in filename if c.isalnum() or c in '._-')
        if not safe:
            return jsonify({'erro': 'filename inválido'}), 400
        img_bytes = base64.b64decode(data_b64 + '==')
        (FOTOS_DIR / safe).write_bytes(img_bytes)
        return jsonify({'ok': True, 'filename': safe})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ══════════════════════════════════════════════════
#  USUÁRIOS (overrides + extras + senhas + deleted)
# ══════════════════════════════════════════════════

@app.route("/salvar_usuarios", methods=["OPTIONS", "POST"])
def salvar_usuarios():
    if request.method == "OPTIONS": return "", 204
    try:
        body = request.get_data(as_text=True)
        USUARIOS_FILE.write_text(body, encoding='utf-8')
        return jsonify({"ok": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/carregar_usuarios", methods=["GET"])
def carregar_usuarios():
    try:
        if USUARIOS_FILE.exists():
            return USUARIOS_FILE.read_text(encoding='utf-8'), 200, {"Content-Type": "application/json"}
        return jsonify({}), 200
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
