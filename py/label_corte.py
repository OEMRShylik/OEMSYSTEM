import io
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import qrcode
from pypdf import PdfReader
from reportlab.lib.colors import HexColor, black
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

MM_TO_PT = 2.83465
LABEL_W = 90 * MM_TO_PT
LABEL_H = 45 * MM_TO_PT

PEDIDO_RE = re.compile(r'NRO PEDIDO\s*:\s*(\d{6})', re.IGNORECASE)
OP_RE = re.compile(r'NRO OP\s*:\s*(\d+)', re.IGNORECASE)
DATE_RE = re.compile(r'Data Entrega\s*:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})', re.IGNORECASE)
ITEM_RE = re.compile(r'ITEM A PRODUZIR\s*:\s*([\w.\-]+)', re.IGNORECASE)
QTY_RE = re.compile(r'QUANTIDADE\s*:\s*([\d.,]+)', re.IGNORECASE)
CUT_RE = re.compile(r'TAMANHO DE CORTE[^:]*:\s*([\d.,]+)', re.IGNORECASE)
DESC_RE = re.compile(
    r'(?:PRODUTO ACABADO\s*:\s*[\w.\-]+\s+)?QUANTIDADE\s*:\s*[\d.,]+\s*\n(.+?)\nTAMANHO DE CORTE',
    re.IGNORECASE | re.DOTALL,
)


@dataclass
class CorteLabelJob:
    item_code: str
    description: str
    pedido: str = ''
    op_number: str = ''
    date_str: str = ''
    quantity_text: str = '1'
    unit: str = 'PC'


def _extract_first(pattern: re.Pattern, text: str) -> str:
    match = pattern.search(text)
    return match.group(1).strip() if match else ''


def _parse_decimal_br(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    normalized = value.strip().replace('.', '').replace(',', '.')
    try:
        return float(normalized)
    except ValueError:
        return None


def _parse_quantity_to_int(value: str) -> int:
    parsed = _parse_decimal_br(value)
    if parsed is None:
        return 0
    return max(0, int(round(parsed)))


def _extract_description(text: str) -> str:
    match = DESC_RE.search(text)
    if match:
        description = ' '.join(match.group(1).split())
        return description.strip(' -')

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    try:
        qty_idx = next(i for i, line in enumerate(lines) if 'QUANTIDADE' in line.upper())
        cut_idx = next(i for i, line in enumerate(lines) if 'TAMANHO DE CORTE' in line.upper())
    except StopIteration:
        return ''

    if qty_idx + 1 < cut_idx:
        description = ' '.join(lines[qty_idx + 1:cut_idx]).strip()
        return description.strip(' -')
    return ''


def _date_to_mmyyyy(date_str: Optional[str]) -> str:
    if not date_str:
        return ''
    parts = date_str.split('/')
    return f'{parts[1]}/{parts[2]}' if len(parts) == 3 else date_str


def _build_qr_bytes(job: CorteLabelJob) -> bytes:
    payload = f'{job.item_code}|{job.pedido}|{job.op_number}|{job.description}'
    image = qrcode.make(payload)
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


def _wrap_text(text: str, max_chars: int = 42) -> List[str]:
    text = ' '.join(text.split())
    if len(text) <= max_chars:
        return [text]
    words = text.split()
    lines: List[str] = []
    current = ''
    for word in words:
        candidate = f'{current} {word}'.strip()
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
            if len(lines) == 1:
                break
    remaining = ' '.join(words[len(' '.join(lines + [current]).split()):]).strip()
    if remaining and len(current) > max_chars:
        current = current[: max_chars - 3] + '...'
    lines.append(current)
    return lines[:2]


def _draw_single_label(c: canvas.Canvas, job: CorteLabelJob):
    blue = HexColor('#1F4E79')
    light_gray = HexColor('#F3F3F3')
    qr_image = ImageReader(io.BytesIO(_build_qr_bytes(job)))

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
    c.drawImage(qr_image, LABEL_W - qr_size - 12, LABEL_H - qr_size - 10, width=qr_size, height=qr_size)

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


def _render_jobs_to_pdf(jobs: List[CorteLabelJob]) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(LABEL_W, LABEL_H))
    for job in jobs:
        _draw_single_label(c, job)
        c.showPage()
    c.save()
    return buffer.getvalue()


def build_corte_document(pdf_bytes: bytes, pedido_default: str = '') -> Dict[str, Any]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    jobs: List[CorteLabelJob] = []
    pedido_fallback = ''

    for page in reader.pages:
        text = page.extract_text() or ''
        if 'TAMANHO DE CORTE' not in text:
            continue

        cut_value = _extract_first(CUT_RE, text)
        cut_mm = _parse_decimal_br(cut_value)

        # páginas de kit/índice ficam com 0,0000000 e devem ser ignoradas
        if cut_mm is None or cut_mm == 0:
            continue

        item_code = _extract_first(ITEM_RE, text)
        qty_text = _extract_first(QTY_RE, text)
        quantity = _parse_quantity_to_int(qty_text)
        if not item_code or quantity <= 0:
            continue

        description = _extract_description(text) or item_code
        pedido = _extract_first(PEDIDO_RE, text)
        op_number = _extract_first(OP_RE, text)
        date_str = _extract_first(DATE_RE, text)
        pedido_fallback = pedido_fallback or pedido

        for _ in range(quantity):
            jobs.append(
                CorteLabelJob(
                    item_code=item_code,
                    description=description,
                    pedido=pedido,
                    op_number=op_number,
                    date_str=date_str,
                    quantity_text='1',
                    unit='PC',
                )
            )

    if not jobs:
        raise ValueError('Nenhum item com tamanho de corte diferente de 0,0000 foi encontrado.')

    jobs.reverse()

    pedido = pedido_fallback or pedido_default or 'SEM_PEDIDO'
    return {
        'file_name': f'CORTE_{pedido}.pdf',
        'pdf_bytes': _render_jobs_to_pdf(jobs),
        'jobs': jobs,
    }
