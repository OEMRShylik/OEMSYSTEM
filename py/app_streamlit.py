import base64
import io
import re
import zipfile
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from op_organizer import reorder_pdf, summarize
from label_generator_modulo_corrigido import build_label_documents
from label_generator_embalagem_final import build_embalagem_document
from label_corte import build_corte_document

PEDIDO_RE = re.compile(r"NRO PEDIDO\s*:\s*(\d{6})", re.IGNORECASE)


def extract_pedido(pdf_bytes: bytes, uploaded_name: str) -> str:
    text = pdf_bytes[:2000].decode("latin-1", errors="ignore")
    m = PEDIDO_RE.search(text)
    if m:
        return m.group(1)
    stem_digits = re.findall(r"\d{6}", Path(uploaded_name).stem)
    return stem_digits[0] if stem_digits else "SEM_PEDIDO"


def build_download_zip(
    pedido: str,
    organized_pdf_bytes: bytes,
    label_docs: list,
    embalagem_doc: dict | None,
    corte_doc: dict | None,
) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{pedido}.pdf", organized_pdf_bytes)

        for doc in label_docs:
            zf.writestr(doc["file_name"], doc["pdf_bytes"])

        if embalagem_doc and embalagem_doc.get("pdf_bytes"):
            zf.writestr(embalagem_doc["file_name"], embalagem_doc["pdf_bytes"])

        if corte_doc and corte_doc.get("pdf_bytes"):
            zf.writestr(corte_doc["file_name"], corte_doc["pdf_bytes"])

    return buf.getvalue()


def trigger_auto_download(file_name: str, data: bytes, mime: str, token: str):
    b64 = base64.b64encode(data).decode("utf-8")
    components.html(
        f"""
        <a id="auto-download-{token}" href="data:{mime};base64,{b64}" download="{file_name}" style="display:none;">download</a>
        <script>
            const link = document.getElementById("auto-download-{token}");
            if (link) {{
                link.click();
            }}
        </script>
        """,
        height=0,
    )


icon_path = Path(__file__).parent / "assets" / "logo_H.ico"

st.set_page_config(
    page_title="Novo Pedido",
    page_icon=str(icon_path),
    layout="wide",
)
st.markdown("## Novo Pedido")

uploaded = st.file_uploader("PDF da OP", type=["pdf"])

if uploaded is not None:
    pdf_bytes = uploaded.getvalue()

    try:
        with st.spinner("Processando PDF..."):
            pedido = extract_pedido(pdf_bytes, uploaded.name)
            out_bytes, _, ordered_groups = reorder_pdf(pdf_bytes)
            ordered_summary = summarize(ordered_groups)
            label_docs = build_label_documents(pdf_bytes, uploaded.name)
            corte_doc = build_corte_document(out_bytes, pedido)

            embalagem_doc = None
            try:
                embalagem_doc = build_embalagem_document(pdf_bytes)
            except Exception:
                embalagem_doc = None

        _ = sum((g.end_page - g.start_page + 1) for g in ordered_groups)
        _ = sum(1 for item in ordered_summary if item.get("is_index"))
        _ = len({item.get("hose_family") for item in ordered_summary if item.get("hose_family")})
        _ = sum(len(doc.get("jobs", [])) for doc in label_docs)

        zip_bytes = build_download_zip(pedido, out_bytes, label_docs, embalagem_doc, corte_doc)
        zip_name = f"{pedido}_pdfs.zip"

        upload_token = f"{uploaded.name}_{len(pdf_bytes)}_{len(zip_bytes)}"
        last_token = st.session_state.get("last_auto_download_token")
        if last_token != upload_token:
            trigger_auto_download(zip_name, zip_bytes, "application/zip", upload_token)
            st.session_state["last_auto_download_token"] = upload_token

        st.download_button(
            "⬇️ Baixar todos os PDFs",
            data=zip_bytes,
            file_name=zip_name,
            mime="application/zip",
            use_container_width=True,
        )

    except Exception as e:
        st.error(f"Erro ao processar PDF: {e}")
