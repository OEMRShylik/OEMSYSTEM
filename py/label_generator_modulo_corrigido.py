
import io
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

import qrcode
from pypdf import PdfReader
from reportlab.lib.colors import HexColor, black
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

MM_TO_PT = 2.83465
LABEL_W = 90 * MM_TO_PT
LABEL_H = 45 * MM_TO_PT

INDEX_ITEM_RE = re.compile(r'^\s*([\d.,]+)\s+(PC|MT)\s+([\w.\-]+)\s+(.+?)\s*$', re.IGNORECASE | re.MULTILINE)
PEDIDO_RE = re.compile(r'NRO PEDIDO\s*:\s*(\d{6})', re.IGNORECASE)
OP_RE = re.compile(r'NRO OP\s*:\s*(\d+)', re.IGNORECASE)
DATE_RE = re.compile(r'Data Entrega\s*:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})', re.IGNORECASE)
ITEM_RE = re.compile(r'ITEM A PRODUZIR:\s*([\w.\-]+)', re.IGNORECASE)
ITEM_QTY_RE = re.compile(r'ITEM A PRODUZIR:\s*([\w.\-]+)\s+QUANTIDADE:\s*([\d.,]+)', re.IGNORECASE)
CUT_ZERO_RE = re.compile(r'TAMANHO DE CORTE \(Em Milímetros\):\s*0,0+', re.IGNORECASE)
DESC_FROM_PAGE_RE = re.compile(r'ITEM A PRODUZIR:\s*[\w.\-]+(?:\s+QUANTIDADE:\s*[\d.,]+)?\s*\n(.+?)\nTAMANHO DE CORTE', re.IGNORECASE | re.DOTALL)

@dataclass
class LabelJob:
    item_code: str
    quantity_text: str
    unit: str
    description: str
    pedido: str = ''
    op_number: str = ''
    date_str: str = ''

def _date_to_mmyyyy(date_str: Optional[str]) -> str:
    if not date_str:
        return ''
    parts = date_str.split('/')
    return f'{parts[1]}/{parts[2]}' if len(parts) == 3 else date_str

def _extract_index_items(text: str) -> List[tuple[str, str, str, str]]:
    items = []
    for match in INDEX_ITEM_RE.finditer(text):
        qty = match.group(1).strip()
        unit = match.group(2).strip().upper()
        item_code = match.group(3).strip()
        desc = ' '.join(match.group(4).strip().split())
        if item_code.upper().startswith(('NRO', 'ITEM', 'TOTAL', 'DATA')):
            continue
        code_upper = item_code.upper()
        is_h_item = code_upper.startswith('H')
        is_real_list_item = bool(re.match(r'^[A-Z0-9.\-]+$', code_upper))
        if not is_real_list_item:
            continue
        if desc or is_h_item:
            items.append((item_code, qty, unit, desc))
    return items

def _extract_page_item(text: str):
    m = ITEM_QTY_RE.search(text)
    if not m:
        return None
    item_code = m.group(1).strip()
    qty = m.group(2).strip()
    dm = DESC_FROM_PAGE_RE.search(text)
    if not dm:
        return None
    desc = ' '.join(dm.group(1).split()).strip(' -')
    if not item_code or not desc:
        return None
    return item_code, qty, 'PC', desc

def _build_qr_bytes(job: LabelJob) -> bytes:
    payload = f'{job.item_code}|{job.pedido}|{job.op_number}|{job.quantity_text}|{job.description}'
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

def _wrap_text(text: str, max_chars: int = 42) -> list[str]:
    text = ' '.join(text.split())
    if len(text) <= max_chars:
        return [text]
    words = text.split()
    lines = []
    current = ''
    for word in words:
        test = f'{current} {word}'.strip()
        if len(test) <= max_chars:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
            if len(lines) == 1:
                break
    remaining = ' '.join(words[len(' '.join(lines + [current]).split()):]).strip()
    if remaining:
        current = (current[: max_chars - 3] + '...') if len(current) > max_chars else current
    lines.append(current)
    return lines[:2]

def _draw_single_label(c: canvas.Canvas, job: LabelJob):
    blue = HexColor('#1F4E79')
    light_gray = HexColor('#F3F3F3')
    qr_img = ImageReader(io.BytesIO(_build_qr_bytes(job)))
    c.setFillColor(light_gray)
    c.rect(0, 0, LABEL_W, LABEL_H, fill=1, stroke=0)
    logo_candidates = [
        Path(__file__).with_name('logo_hylik.png'),
        Path(__file__).with_name('assets').joinpath('logo_hylik.png'),
        Path(__file__).with_name('d2dfcc94-6991-4107-85f8-b55415b2749f.png'),
    ]
    logo_drawn = False
    for logo_path in logo_candidates:
        if logo_path.exists():
            try:
                logo = ImageReader(str(logo_path))
                c.drawImage(logo, 10, LABEL_H - 26, width=92, height=18, mask='auto')
                logo_drawn = True
                break
            except Exception:
                pass
    if not logo_drawn:
        c.setFillColor(blue)
        c.setFont('Helvetica-Bold', 16)
        c.drawString(10, LABEL_H - 20, 'HYLIK')
    c.setFillColor(black)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(100, LABEL_H - 17, '| OEM SERVICE')
    qr_size = 60
    c.drawImage(qr_img, LABEL_W - qr_size - 12, LABEL_H - qr_size - 10, width=qr_size, height=qr_size)
    c.setFillColor(black)
    c.setFont('Helvetica-Bold', 16)
    c.drawCentredString(96, LABEL_H - 50, job.item_code)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(96, LABEL_H - 67, f'{job.quantity_text} {job.unit}')
    c.setFont('Helvetica', 8)
    y = LABEL_H - 84
    for line in _wrap_text(job.description, 44):
        c.drawString(10, y, line)
        y -= 10
    date_text = _date_to_mmyyyy(job.date_str)
    if date_text:
        c.setFont('Helvetica-Bold', 10)
        c.drawString(10, 6, date_text)

def _render_jobs_to_pdf(jobs: List[LabelJob]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(LABEL_W, LABEL_H))
    for job in jobs:
        _draw_single_label(c, job)
        c.showPage()
    c.save()
    return buf.getvalue()

def _extract_first(pattern: re.Pattern, text: str) -> str:
    m = pattern.search(text)
    return m.group(1).strip() if m else ''

def build_label_documents(pdf_bytes: bytes, file_name: str = 'arquivo.pdf') -> List[Dict[str, Any]]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    label_docs = []
    index_pages = []
    for page in reader.pages:
        text = page.extract_text() or ''
        if 'TAMANHO DE CORTE' not in text or not CUT_ZERO_RE.search(text):
            continue
        items = _extract_index_items(text)
        if not items:
            continue
        pedido = _extract_first(PEDIDO_RE, text)
        op_number = _extract_first(OP_RE, text)
        date_str = _extract_first(DATE_RE, text)
        item_ref = _extract_first(ITEM_RE, text) or 'KIT'
        index_pages.append((item_ref, items, pedido, op_number, date_str))
    safe_name = Path(file_name).stem
    if index_pages:
        for item_ref, items, pedido, op_number, date_str in index_pages:
            jobs = [LabelJob(item_code=i, quantity_text=q, unit=u, description=d, pedido=pedido, op_number=op_number, date_str=date_str) for i, q, u, d in items]
            label_docs.append({'file_name': f'KIT_{item_ref}_{safe_name}.pdf', 'pdf_bytes': _render_jobs_to_pdf(jobs), 'jobs': jobs})
        return label_docs
    jobs = []
    for page in reader.pages:
        text = page.extract_text() or ''
        page_item = _extract_page_item(text)
        if not page_item:
            continue
        item_code, qty, unit, desc = page_item
        pedido = _extract_first(PEDIDO_RE, text)
        op_number = _extract_first(OP_RE, text)
        date_str = _extract_first(DATE_RE, text)
        jobs.append(LabelJob(item_code=item_code, quantity_text=qty, unit=unit, description=desc, pedido=pedido, op_number=op_number, date_str=date_str))
    if jobs:
        label_docs.append({'file_name': f'ETIQUETAS_{safe_name}.pdf', 'pdf_bytes': _render_jobs_to_pdf(jobs), 'jobs': jobs})
    return label_docs

def summarize_label_documents(label_docs: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    rows = []
    for doc in label_docs:
        for job in doc.get('jobs', []):
            rows.append({'Quantidade': job.quantity_text, 'Unidade': job.unit, 'Código': job.item_code, 'Descrição': job.description, 'Arquivo': doc.get('file_name', '')})
    return rows
