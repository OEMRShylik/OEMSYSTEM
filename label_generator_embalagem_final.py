import io
import re
from dataclasses import dataclass
from pathlib import Path

import qrcode
from pypdf import PdfReader
from reportlab.lib.colors import HexColor, black
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

MM_TO_PT = 2.83465
LABEL_W = 90 * MM_TO_PT
LABEL_H = 45 * MM_TO_PT

PEDIDO_RE = re.compile(r'NRO PEDIDO\s*:\s*(\d{6})', re.IGNORECASE)
CLIENTE_RE = re.compile(r'Nome Cliente\s*:\s*(.+)', re.IGNORECASE)
DATA_RE = re.compile(r'Data Entrega\s*:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})', re.IGNORECASE)
ITEM_RE = re.compile(r'ITEM A PRODUZIR:\s*([\w.\-]+)', re.IGNORECASE)
ITEM_QTY_RE = re.compile(r'ITEM A PRODUZIR:\s*([\w.\-]+)(?:\s+QUANTIDADE:\s*[\d.,]+)?', re.IGNORECASE)
DESC_RE = re.compile(
    r'ITEM A PRODUZIR:\s*[\w.\-]+(?:\s+QUANTIDADE:\s*[\d.,]+)?\s*\n(.+?)\nTAMANHO DE CORTE',
    re.IGNORECASE | re.DOTALL,
)
CUT_ZERO_RE = re.compile(r'TAMANHO DE CORTE \(Em Milímetros\):\s*0,0+', re.IGNORECASE)
CNPJ_TAIL_RE = re.compile(r'\s*-\s*[\d./-]+\s*$')


@dataclass
class EmbalagemLabel:
    pedido: str
    data: str
    cliente: str
    item: str
    descricao: str


def _first(pattern, text):
    m = pattern.search(text)
    return m.group(1).strip() if m else ''


def _cliente_nome(cliente):
    cliente = CNPJ_TAIL_RE.sub('', cliente or '')
    return cliente.split()[0].upper() if cliente else ''


def _descricao(text):
    m = DESC_RE.search(text)
    if not m:
        return ''
    desc = ' '.join(m.group(1).split())
    desc = re.sub(r'\bQUANTIDADE:\s*[\d.,]+\b', '', desc, flags=re.IGNORECASE)
    return desc.strip(' -')


def _qr(job):
    img = qrcode.make(f'{job.pedido}|{job.item}|{job.descricao}')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def _wrap_lines(c, text, max_width, font_name, font_size):
    words = text.split()
    if not words:
        return []
    lines = []
    current = words[0]
    c.setFont(font_name, font_size)
    for word in words[1:]:
        test = f'{current} {word}'
        if c.stringWidth(test, font_name, font_size) <= max_width:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _fit_text_block(c, text, max_width, max_height, font_name='Helvetica-Bold', preferred_sizes=(11, 10, 9, 8), line_gap=2, max_lines_cap=5):
    for font_size in preferred_sizes:
        line_height = font_size + line_gap
        max_lines = min(max_lines_cap, max(1, int(max_height // line_height)))
        lines = _wrap_lines(c, text, max_width, font_name, font_size)
        if len(lines) <= max_lines:
            return lines, font_size, line_height
    font_size = preferred_sizes[-1]
    line_height = font_size + line_gap
    max_lines = min(max_lines_cap, max(1, int(max_height // line_height)))
    lines = _wrap_lines(c, text, max_width, font_name, font_size)
    return lines[:max_lines], font_size, line_height


def _logo(c):
    for logo_path in [Path(__file__).with_name('logo_hylik.png'), Path(__file__).parent / 'assets' / 'logo_hylik.png']:
        if logo_path.exists():
            try:
                logo = ImageReader(str(logo_path))
                c.drawImage(logo, 6, LABEL_H - 16, width=60, height=18, mask='auto')
                break
            except Exception:
                pass
    else:
        c.setFillColor(black)
        c.setFont('Helvetica-Bold', 10)
        c.drawString(6, LABEL_H - 12, 'HYLIK')
    c.setFillColor(black)
    c.setFont('Helvetica-Bold', 9)
    c.drawString(65, LABEL_H - 12, '| OEM SERVICE')


def _draw(c, job):
    c.setFillColor(HexColor('#F3F3F3'))
    c.rect(0, 0, LABEL_W, LABEL_H, fill=1, stroke=0)
    _logo(c)
    c.setFillColor(black)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(6, LABEL_H - 26, f'DATA: {job.data}')
    c.setFont('Helvetica-Bold', 22)
    c.drawString(6, LABEL_H - 62, job.cliente)
    qr_size = 56
    qr_x = LABEL_W - qr_size - 6
    qr_y = 4
    texto = f'{job.item} - {job.descricao}'.strip(' -')
    text_top_y = LABEL_H - 84
    text_bottom_y = 28
    text_width = qr_x - 10
    text_height = text_top_y - text_bottom_y
    linhas, font_size, line_height = _fit_text_block(c, texto, text_width, text_height)
    c.setFont('Helvetica-Bold', font_size)
    y = text_top_y
    for linha in linhas:
        c.drawString(6, y, linha)
        y -= line_height
    c.setFont('Helvetica-Bold', 12)
    c.drawString(6, 22, 'PEDIDO:')
    c.setFont('Helvetica-Bold', 22)
    c.drawString(6, 4, job.pedido)
    qr = ImageReader(io.BytesIO(_qr(job)))
    c.drawImage(qr, qr_x, qr_y, width=qr_size, height=qr_size)


def _document_defaults(reader: PdfReader):
    pedido = ''
    cliente = ''
    data = ''
    for page in reader.pages:
        text = page.extract_text() or ''
        if not pedido:
            pedido = _first(PEDIDO_RE, text)
        if not cliente:
            cliente = _cliente_nome(_first(CLIENTE_RE, text))
        if not data:
            data = _first(DATA_RE, text)
        if pedido and cliente and data:
            break
    return pedido, cliente, data


def build_embalagem_document(pdf_bytes: bytes):
    reader = PdfReader(io.BytesIO(pdf_bytes))
    default_pedido, default_cliente, default_data = _document_defaults(reader)

    labels = []
    for page in reader.pages:
        text = page.extract_text() or ''
        if not CUT_ZERO_RE.search(text):
            continue

        pedido = _first(PEDIDO_RE, text) or default_pedido
        cliente = _cliente_nome(_first(CLIENTE_RE, text)) or default_cliente
        data = _first(DATA_RE, text) or default_data
        item = _first(ITEM_RE, text)
        desc = _descricao(text)

        if item and desc:
            labels.append(EmbalagemLabel(pedido=pedido, data=data, cliente=cliente, item=item, descricao=desc))

    if not labels:
        for page in reader.pages:
            text = page.extract_text() or ''
            pedido = _first(PEDIDO_RE, text) or default_pedido
            cliente = _cliente_nome(_first(CLIENTE_RE, text)) or default_cliente
            data = _first(DATA_RE, text) or default_data
            item_match = ITEM_QTY_RE.search(text)
            item = item_match.group(1).strip() if item_match else ''
            desc = _descricao(text)
            if item and desc:
                labels.append(EmbalagemLabel(pedido=pedido, data=data, cliente=cliente, item=item, descricao=desc))

    if not labels:
        raise ValueError('Nenhum item elegível para etiqueta de embalagem encontrado.')

    file_pedido = next((label.pedido for label in labels if label.pedido), 'SEM_PEDIDO')

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(LABEL_W, LABEL_H))
    for label in labels:
        _draw(c, label)
        c.showPage()
    c.save()
    return {'file_name': f'EMBALAGEM_{file_pedido}.pdf', 'pdf_bytes': buf.getvalue()}
