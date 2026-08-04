from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[2]
pdf_path = root / "docs" / "producer-marketplace-integration.pdf"
out_dir = root / ".agents" / "outputs" / "producer-marketplace-pdf"
out_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}")
for page_number in [0, min(1, doc.page_count - 1), doc.page_count - 1]:
    page = doc[page_number]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    output = out_dir / f"page-{page_number + 1}.png"
    pix.save(output)
    print(output)