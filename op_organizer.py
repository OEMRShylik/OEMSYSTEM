import io
import json
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

from pypdf import PdfReader, PdfWriter

CUT_RE = re.compile(r"TAMANHO DE CORTE \(Em Milímetros\):\s*([\d.,]+)", re.IGNORECASE)
OP_RE = re.compile(r"NRO OP\s*:\s*(\d+)", re.IGNORECASE)
PEDIDO_RE = re.compile(r"NRO PEDIDO\s*:\s*(\d{6})", re.IGNORECASE)
ITEM_RE = re.compile(r"ITEM A PRODUZIR:\s*([\w.\-]+)", re.IGNORECASE)

HOSE_MT_RE = re.compile(
    r"\b\d+,\d+\s+MT\s+([A-Z0-9]+)\s+(?:MANG\b|MANG\.|MANGUEIRA\b)",
    re.IGNORECASE,
)
HOSE_ANYWHERE_RE = re.compile(
    r"\b(HR\d+[A-Z]*|SR\d+[A-Z]*|H2SC\d+[A-Z]*|H1SC\d+[A-Z]*|S2SC\d+[A-Z]*|S1SC\d+[A-Z]*|S2SNK\d+[A-Z]*|S1SNK\d+[A-Z]*|SNSK\d+[A-Z]*|R1SC\d+[A-Z]*|HLR\d+[A-Z]*)\b",
    re.IGNORECASE,
)


@dataclass
class PageGroup:
    op_number: str
    start_page: int
    end_page: int
    hose_code: Optional[str]
    hose_family: Optional[str]
    hose_family_rank: int
    item_code: Optional[str]
    cut_mm: Optional[float]
    is_index: bool
    raw_cut: Optional[str]

    @property
    def page_span(self) -> List[int]:
        return list(range(self.start_page, self.end_page + 1))


def parse_decimal_br(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    value = value.strip().replace(".", "").replace(",", ".")
    try:
        return float(value)
    except Exception:
        return None


def extract_text(reader: PdfReader, page_index: int) -> str:
    try:
        return reader.pages[page_index].extract_text() or ""
    except Exception:
        return ""


def extract_item_code(text: str) -> Optional[str]:
    match = ITEM_RE.search(text)
    return match.group(1).strip() if match else None


def _item_code_sort_value(code: Optional[str]) -> Tuple[int, str]:
    if not code:
        return (0, "")
    m = re.search(r"(\d+)", str(code))
    num = int(m.group(1)) if m else 0
    return (num, str(code))


def extract_pedido_from_pdf(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    for i in range(min(8, len(reader.pages))):
        text = extract_text(reader, i)
        match = PEDIDO_RE.search(text)
        if match:
            return match.group(1)
    return "SEM_PEDIDO"


def _detect_hr_family(code: str) -> Optional[str]:
    if re.match(r"^HR8N", code):
        return "HR8N"
    if re.match(r"^HR7N", code):
        return "HR7N"
    if re.match(r"^HR17", code):
        return "HR17"
    if re.match(r"^HR15", code):
        return "HR15"
    if re.match(r"^HR14", code):
        return "HR14"

    m = re.match(r"^(HR[1-9])([0-9].*)$", code)
    if m:
        base = m.group(1)
        rest = m.group(2)
        if rest.endswith("AT"):
            return f"{base}AT"
        if rest.endswith("L"):
            return f"{base}L"
        if rest.endswith("E"):
            return f"{base}E"
        if rest.endswith("P"):
            return f"{base}P"
        return base
    return None


def extract_hose(text: str) -> Tuple[Optional[str], Optional[str], int]:
    code: Optional[str] = None

    for line in text.splitlines():
        if " MT " not in f" {line} ":
            continue
        if not re.search(r"MANG\b|MANG\.|MANGUEIRA\b", line, re.IGNORECASE):
            continue
        mt_match = HOSE_MT_RE.search(line)
        if mt_match:
            code = mt_match.group(1).upper()
            break
        fallback = HOSE_ANYWHERE_RE.search(line)
        if fallback:
            code = fallback.group(1).upper()
            break

    if not code:
        mt_full_match = HOSE_MT_RE.search(text)
        if mt_full_match:
            code = mt_full_match.group(1).upper()

    if not code:
        fallback = HOSE_ANYWHERE_RE.search(text)
        if fallback:
            code = fallback.group(1).upper()

    if not code:
        return None, None, 0

    family_patterns = [
        ("S2SNK", r"^S2SNK"),
        ("S1SNK", r"^S1SNK"),
        ("SNSK", r"^SNSK"),
        ("H2SC", r"^H2SC"),
        ("H1SC", r"^H1SC"),
        ("S2SC", r"^S2SC"),
        ("S1SC", r"^S1SC"),
        ("R1SC", r"^R1SC"),
        ("HLR2", r"^HLR2"),
        ("HLR1", r"^HLR1"),
        ("SR17", r"^SR17"),
        ("SR", r"^SR"),
    ]

    family = None
    for name, pattern in family_patterns:
        if re.match(pattern, code):
            family = name
            break

    if family is None:
        family = _detect_hr_family(code)

    if family is None and code.startswith("HR"):
        family = code

    if family is None:
        family = code

    family_order = {
        "SR17": 220,
        "SR": 210,
        "HR17": 200,
        "HR15": 190,
        "HR14": 180,
        "HR8N": 175,
        "HR7N": 170,
        "HR8": 168,
        "HR7": 166,
        "HR6": 164,
        "HR5": 162,
        "HR4P": 161,
        "HR4AT": 160,
        "HR4L": 159,
        "HR4E": 158,
        "HR4": 157,
        "HR3P": 156,
        "HR3AT": 155,
        "HR3L": 154,
        "HR3E": 153,
        "HR3": 152,
        "HR2P": 151,
        "HR2AT": 150,
        "HR2L": 149,
        "HR2E": 148,
        "HR2": 147,
        "HR1P": 146,
        "HR1AT": 145,
        "HR1L": 144,
        "HR1E": 143,
        "HR1": 142,
        "HLR2": 141,
        "HLR1": 140,
        "H2SC": 130,
        "H1SC": 129,
        "S2SC": 128,
        "S1SC": 127,
        "S2SNK": 126,
        "S1SNK": 125,
        "SNSK": 124,
        "R1SC": 123,
    }
    return code, family, family_order.get(family, 0)


def collect_groups(pdf_bytes: bytes) -> Tuple[List[PageGroup], PdfReader]:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    page_count = len(reader.pages)
    groups: List[PageGroup] = []

    i = 0
    while i < page_count:
        text = extract_text(reader, i)
        op_match = OP_RE.search(text)
        op = op_match.group(1) if op_match else f"SEM_OP_{i + 1}"

        cut_match = CUT_RE.search(text)
        raw_cut = cut_match.group(1) if cut_match else None
        cut_mm = parse_decimal_br(raw_cut)
        is_index = cut_mm == 0.0 if cut_mm is not None else False

        item_code = extract_item_code(text)
        hose_code, hose_family, hose_family_rank = extract_hose(text)

        end = i
        j = i + 1
        while j < page_count:
            next_text = extract_text(reader, j)
            next_op_match = OP_RE.search(next_text)
            next_op = next_op_match.group(1) if next_op_match else None
            next_has_cut = CUT_RE.search(next_text) is not None
            if next_op == op and not next_has_cut:
                end = j
                j += 1
            else:
                break

        if not is_index and not hose_code:
            raise ValueError(f"Mangueira não identificada na página {i + 1}")

        groups.append(
            PageGroup(
                op_number=op,
                start_page=i + 1,
                end_page=end + 1,
                hose_code=hose_code,
                hose_family=hose_family,
                hose_family_rank=hose_family_rank,
                item_code=item_code,
                cut_mm=cut_mm,
                is_index=is_index,
                raw_cut=raw_cut,
            )
        )
        i = end + 1

    return groups, reader


def _hose_code_sort_value(code: Optional[str]) -> Tuple[str, int, str]:
    if not code:
        return ("", 0, "")
    code = str(code).upper().strip()
    m = re.match(r"^([A-Z]+[A-Z0-9]*?)(\d+)([A-Z]*)$", code)
    if m:
        prefix = m.group(1)
        num = int(m.group(2))
        suffix = m.group(3)
        return (prefix, num, suffix)
    m = re.search(r"(\d+)(?!.*\d)", code)
    num = int(m.group(1)) if m else 0
    prefix = re.sub(r"\d+[A-Z]*$", "", code)
    suffix_match = re.search(r"\d+([A-Z]*)$", code)
    suffix = suffix_match.group(1) if suffix_match else ""
    return (prefix, num, suffix)

def sort_groups(groups: List[PageGroup]) -> List[PageGroup]:
    index_groups = [g for g in groups if g.is_index]
    production_groups = [g for g in groups if not g.is_index]

    def sort_key(g: PageGroup):
        hose_prefix, hose_num, hose_suffix = _hose_code_sort_value(g.hose_code)
        item_num, item_code = _item_code_sort_value(g.item_code)

        return (
            -(g.hose_family_rank if g.hose_family_rank is not None else -1),
            hose_prefix,
            -hose_num,
            hose_suffix,
            -(g.cut_mm if g.cut_mm is not None else -1),
            -item_num,
            item_code,
            g.start_page,
        )

    production_groups.sort(key=sort_key)
    return index_groups + production_groups

def reorder_pdf(pdf_bytes: bytes) -> Tuple[bytes, List[PageGroup], List[PageGroup]]:
    groups, reader = collect_groups(pdf_bytes)
    ordered_groups = sort_groups(groups)

    writer = PdfWriter()
    for group in ordered_groups:
        for p in range(group.start_page - 1, group.end_page):
            writer.add_page(reader.pages[p])

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue(), groups, ordered_groups


def summarize(groups: List[PageGroup]) -> List[dict]:
    summary = []
    for pos, g in enumerate(groups, start=1):
        summary.append(
            {
                "ordem": pos,
                "op_number": g.op_number,
                "pages": f"{g.start_page}" if g.start_page == g.end_page else f"{g.start_page}-{g.end_page}",
                "hose_code": g.hose_code,
                "hose_family": g.hose_family,
                "hose_family_rank": g.hose_family_rank,
                "item_code": g.item_code,
                "cut_mm": g.cut_mm,
                "is_index": g.is_index,
            }
        )
    return summary


if __name__ == "__main__":
    import argparse
    from pathlib import Path

    parser = argparse.ArgumentParser(description="Organiza OP em PDF.")
    parser.add_argument("input_pdf", help="PDF de entrada")
    parser.add_argument("-o", "--output", help="PDF de saída", default=None)
    parser.add_argument("--json", help="Salvar resumo em JSON", default=None)
    args = parser.parse_args()

    input_path = Path(args.input_pdf)
    output_path = Path(args.output) if args.output else input_path.with_name(input_path.stem + "_organizado.pdf")

    pdf_bytes = input_path.read_bytes()
    out_bytes, original_groups, ordered_groups = reorder_pdf(pdf_bytes)
    output_path.write_bytes(out_bytes)

    if args.json:
        Path(args.json).write_text(
            json.dumps(
                {"original": summarize(original_groups), "ordered": summarize(ordered_groups)},
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    print(f"Arquivo gerado: {output_path}")
