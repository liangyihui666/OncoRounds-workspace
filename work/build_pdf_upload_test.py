from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


OUTPUT = Path(r"C:\Users\admin\Documents\ChatGPT\大查房\output\pdf\pdf_test.pdf")


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = A4
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("FastGPT PDF Upload Test")
    c.setAuthor("OpenAI Codex")

    c.setFillColor(HexColor("#17365D"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(72, page_height - 96, "FastGPT PDF Upload Test")

    c.setFillColor(HexColor("#222222"))
    c.setFont("Helvetica", 13)
    lines = [
        "This is a standard one-page PDF with selectable text.",
        "It is only intended to test whether this FastGPT instance accepts PDF uploads.",
        "If this file still shows Data validation error, the problem is platform-side.",
        "If this file uploads successfully, the original case PDF needs conversion.",
    ]
    y = page_height - 150
    for line in lines:
        c.drawString(72, y, line)
        y -= 30

    c.setFillColor(HexColor("#0B7A75"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(72, y - 18, "TEST_ID: FASTGPT_PDF_UPLOAD_001")

    c.showPage()
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
