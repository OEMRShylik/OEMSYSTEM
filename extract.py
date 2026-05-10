"""
extract.py — Extrai dados estruturados de cada página do PDF de OP.
Retorna lista de dicts, um por página/item.
"""
import io
import re
from dataclasses import dataclass, field
from typing import Optional
from pypdf import PdfReader

# ── Padrões ──────────────────────────────────────────────────────────────────
RE_PEDIDO    = re.compile(r'NRO\s+PEDIDO\s*:\s*(\d+)',                         re.I)
RE_CLIENTE   = re.compile(r'Nome\s+Cliente\s*:\s*(.+)',                         re.I)
RE_ENTREGA   = re.compile(r'Data\s+Entrega\s*:\s*(\d{2}/\d{2}/\d{4})',         re.I)
RE_OP        = re.compile(r'NRO\s+OP\s*:\s*(\d+)',                              re.I)
RE_ITEM      = re.compile(r'ITEM\s+A\s+PRODUZIR\s*:\s*(\S+)',                   re.I)
RE_CORTE     = re.compile(r'TAMANHO\s+DE\s+CORTE\s*\(Em\s+Milímetros\)\s*:\s*([\d,\.]+)', re.I)
RE_QTY       = re.compile(r'QUANTIDADE\s*:\s*([\d,\.]+)',                        re.I)
RE_TIPO_CORTE= re.compile(r'Tipo\s+de\s+Corte\s*:\s*(.+)',                      re.I)
RE_ANGULO    = re.compile(r'[Aa]ngulo\s+de\s+Montagem\s*:\s*(.+)?',             re.I)
RE_EMBALAGEM = re.compile(r'Embalagem\s+Individual\s*:\s*(.+)',                  re.I)
RE_FORMA_EMB = re.compile(r'Forma\s+de\s+Embalagem\s*:\s*(.+)',                 re.I)
RE_GRAVACAO  = re.compile(r'Grava[çc][aã]o\s+Capa\s*:\s*(.+)',                 re.I)
RE_ID_EXTRA  = re.compile(r'ID\s+Extra\s*:\s*(.*)',                              re.I)
RE_OBS       = re.compile(r'OBS\s*:\s*(.+)',                                     re.I)
RE_DESC_ITEM = re.compile(
    r'ITEM\s+A\s+PRODUZIR[^\n]*\n(.+?)\nTAMANHO\s+DE\s+CORTE',
    re.I | re.DOTALL
)

# Linha de item de lista: "  1,000000 PC  CODIGO  DESCRICAO"
RE_LISTA_ITEM = re.compile(
    r'^\s*([\d,\.]+)\s+(PC|MT)\s+([\w\.\-]+)\s+(.+?)\s*$',
    re.I | re.MULTILINE
)

CNPJ_TAIL = re.compile(r'\s*[-–]\s*[\d\.\/\-]{10,}\s*$')


def _first(pattern, text, group=1, default=''):
    m = pattern.search(text)
    return m.group(group).strip() if m else default


def _parse_float(s: str) -> Optional[float]:
    if not s:
        return None
    try:
        return float(s.strip().replace('.', '').replace(',', '.'))
    except ValueError:
        return None


def _clean_cliente(raw: str) -> dict:
    """Separa nome e CNPJ do cliente."""
    m = CNPJ_TAIL.search(raw)
    cnpj  = m.group(0).strip().lstrip('-–').strip() if m else ''
    nome  = CNPJ_TAIL.sub('', raw).strip()
    return {'nome': nome, 'cnpj': cnpj}


@dataclass
class ItemLista:
    quantidade: float
    unidade: str
    codigo: str
    descricao: str


@dataclass
class PaginaOP:
    # Cabeçalho (comum ao pedido)
    pedido:      str = ''
    op:          str = ''
    cliente_nome:str = ''
    cliente_cnpj:str = ''
    data_entrega:str = ''

    # Item desta página
    item_codigo: str = ''
    item_qty:    Optional[float] = None
    corte_mm:    Optional[float] = None
    is_index:    bool = False          # True quando corte == 0

    # Informações do produto
    tipo_corte:  str = ''
    angulo:      str = ''
    embalagem:   str = ''
    forma_emb:   str = ''
    gravacao:    str = ''
    id_extra:    str = ''
    obs:         str = ''
    descricao:   str = ''

    # Lista de sub-itens (páginas de kit/índice)
    lista_itens: list = field(default_factory=list)

    # Texto bruto da página
    texto_bruto: str = ''


def extrair_paginas(pdf_bytes: bytes) -> list[PaginaOP]:
    """Extrai dados estruturados de todas as páginas do PDF."""
    reader = PdfReader(io.BytesIO(pdf_bytes))
    paginas: list[PaginaOP] = []

    for page in reader.pages:
        texto = page.extract_text() or ''
        pg    = PaginaOP(texto_bruto=texto)

        # Cabeçalho
        pg.pedido       = _first(RE_PEDIDO,  texto)
        pg.op           = _first(RE_OP,      texto)
        data_entrega    = _first(RE_ENTREGA, texto)
        pg.data_entrega = data_entrega

        raw_cliente = _first(RE_CLIENTE, texto)
        if raw_cliente:
            c = _clean_cliente(raw_cliente)
            pg.cliente_nome = c['nome']
            pg.cliente_cnpj = c['cnpj']

        # Item
        pg.item_codigo = _first(RE_ITEM, texto)
        pg.item_qty    = _parse_float(_first(RE_QTY, texto))

        corte_raw = _first(RE_CORTE, texto)
        pg.corte_mm = _parse_float(corte_raw)
        pg.is_index = pg.corte_mm is not None and pg.corte_mm == 0.0

        # Informações do produto
        pg.tipo_corte = _first(RE_TIPO_CORTE, texto)
        pg.angulo     = _first(RE_ANGULO,     texto)
        pg.embalagem  = _first(RE_EMBALAGEM,  texto)
        pg.forma_emb  = _first(RE_FORMA_EMB,  texto)
        pg.gravacao   = _first(RE_GRAVACAO,   texto)
        pg.id_extra   = _first(RE_ID_EXTRA,   texto)
        pg.obs        = _first(RE_OBS,        texto)

        # Descrição do item (linha entre ITEM A PRODUZIR e TAMANHO DE CORTE)
        dm = RE_DESC_ITEM.search(texto)
        if dm:
            pg.descricao = ' '.join(dm.group(1).split()).strip()

        # Lista de sub-itens (página de kit)
        for m in RE_LISTA_ITEM.finditer(texto):
            qty  = _parse_float(m.group(1)) or 0
            un   = m.group(2).upper()
            cod  = m.group(3).strip()
            desc = m.group(4).strip()
            # Ignora linhas de cabeçalho
            if cod.upper() in ('PC', 'MT', 'QTD', 'ITEM', 'TOTAL'):
                continue
            pg.lista_itens.append(ItemLista(
                quantidade=qty, unidade=un, codigo=cod, descricao=desc
            ))

        paginas.append(pg)

    return paginas


def extrair_resumo(pdf_bytes: bytes) -> dict:
    """Retorna resumo do pedido + lista de páginas serializável (para JSON)."""
    paginas = extrair_paginas(pdf_bytes)
    if not paginas:
        return {'pedido': '', 'cliente': '', 'data_entrega': '', 'paginas': []}

    # Pega metadados do cabeçalho da primeira página que tiver
    pedido       = next((p.pedido       for p in paginas if p.pedido),       '')
    cliente_nome = next((p.cliente_nome for p in paginas if p.cliente_nome), '')
    cliente_cnpj = next((p.cliente_cnpj for p in paginas if p.cliente_cnpj), '')
    data_entrega = next((p.data_entrega for p in paginas if p.data_entrega), '')

    def _pg_dict(pg: PaginaOP, idx: int) -> dict:
        return {
            'pagina':       idx + 1,
            'pedido':       pg.pedido,
            'op':           pg.op,
            'cliente_nome': pg.cliente_nome,
            'cliente_cnpj': pg.cliente_cnpj,
            'data_entrega': pg.data_entrega,
            'item_codigo':  pg.item_codigo,
            'item_qty':     pg.item_qty,
            'corte_mm':     pg.corte_mm,
            'is_index':     pg.is_index,
            'tipo_corte':   pg.tipo_corte,
            'angulo':       pg.angulo,
            'embalagem':    pg.embalagem,
            'forma_emb':    pg.forma_emb,
            'gravacao':     pg.gravacao,
            'id_extra':     pg.id_extra,
            'obs':          pg.obs,
            'descricao':    pg.descricao,
            'lista_itens':  [
                {'quantidade': it.quantidade, 'unidade': it.unidade,
                 'codigo': it.codigo, 'descricao': it.descricao}
                for it in pg.lista_itens
            ],
        }

    return {
        'pedido':       pedido,
        'cliente_nome': cliente_nome,
        'cliente_cnpj': cliente_cnpj,
        'data_entrega': data_entrega,
        'total_paginas': len(paginas),
        'paginas': [_pg_dict(pg, i) for i, pg in enumerate(paginas)],
    }


if __name__ == '__main__':
    import argparse, json, pathlib
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('-o', '--output', default=None)
    args = ap.parse_args()

    data = extrair_resumo(pathlib.Path(args.pdf).read_bytes())
    out  = json.dumps(data, ensure_ascii=False, indent=2)

    if args.output:
        pathlib.Path(args.output).write_text(out, encoding='utf-8')
        print(f'Salvo em {args.output}')
    else:
        print(out)
