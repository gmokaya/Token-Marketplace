from pathlib import Path
import re
import html

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    Table,
    TableStyle,
    Preformatted,
    KeepTogether,
)


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs" / "producer-marketplace-integration.md"
OUTPUT = ROOT / "docs" / "producer-marketplace-integration.pdf"

NAVY = colors.HexColor("#102A43")
TEAL = colors.HexColor("#087F8C")
GOLD = colors.HexColor("#C69214")
INK = colors.HexColor("#243B53")
MUTED = colors.HexColor("#627D98")
LIGHT = colors.HexColor("#F0F4F8")
PALE_TEAL = colors.HexColor("#E6FFFA")
LINE = colors.HexColor("#D9E2EC")
CODE_BG = colors.HexColor("#F5F7FA")


def register_fonts():
    candidates = [
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "AppSans"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "AppSans-Bold"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", "AppMono"),
    ]
    found = {}
    for path, name in candidates:
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))
            found[name] = name
    return found


FONTS = register_fonts()
BODY_FONT = FONTS.get("AppSans", "Helvetica")
BOLD_FONT = FONTS.get("AppSans-Bold", "Helvetica-Bold")
MONO_FONT = FONTS.get("AppMono", "Courier")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="DocTitle",
    fontName=BOLD_FONT,
    fontSize=26,
    leading=32,
    textColor=NAVY,
    alignment=TA_LEFT,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="DocSubtitle",
    fontName=BODY_FONT,
    fontSize=11,
    leading=17,
    textColor=MUTED,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="H1Custom",
    parent=styles["Heading1"],
    fontName=BOLD_FONT,
    fontSize=17,
    leading=22,
    textColor=NAVY,
    spaceBefore=18,
    spaceAfter=9,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="H2Custom",
    parent=styles["Heading2"],
    fontName=BOLD_FONT,
    fontSize=12.5,
    leading=17,
    textColor=TEAL,
    spaceBefore=13,
    spaceAfter=6,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="H3Custom",
    parent=styles["Heading3"],
    fontName=BOLD_FONT,
    fontSize=10.5,
    leading=14,
    textColor=INK,
    spaceBefore=9,
    spaceAfter=4,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="BodyCustom",
    parent=styles["BodyText"],
    fontName=BODY_FONT,
    fontSize=8.8,
    leading=13.2,
    textColor=INK,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="SmallCustom",
    parent=styles["BodyText"],
    fontName=BODY_FONT,
    fontSize=7.5,
    leading=10.5,
    textColor=MUTED,
))
styles.add(ParagraphStyle(
    name="BulletCustom",
    parent=styles["BodyText"],
    fontName=BODY_FONT,
    fontSize=8.8,
    leading=13,
    leftIndent=13,
    firstLineIndent=-7,
    bulletIndent=0,
    textColor=INK,
    spaceAfter=2,
))
styles.add(ParagraphStyle(
    name="CodeCustom",
    fontName=MONO_FONT,
    fontSize=7.1,
    leading=9.2,
    textColor=colors.HexColor("#334E68"),
    leftIndent=4,
    rightIndent=4,
    spaceBefore=3,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Callout",
    fontName=BODY_FONT,
    fontSize=8.4,
    leading=12.5,
    textColor=colors.HexColor("#3E4C59"),
    leftIndent=5,
    rightIndent=5,
    spaceBefore=5,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="TOCItem",
    fontName=BODY_FONT,
    fontSize=9,
    leading=14,
    textColor=INK,
    leftIndent=5,
    spaceAfter=2,
))


def inline_markup(value: str) -> str:
    value = html.escape(value, quote=False)
    value = re.sub(r"`([^`]+)`", r"<font name='AppMono'>\1</font>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    return value


def markdown_table(lines):
    rows = []
    for line in lines:
        if not line.strip() or re.match(r"^\s*\|?\s*:?-{3,}", line):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        rows.append([Paragraph(inline_markup(c), styles["SmallCustom"]) for c in cells])
    if not rows:
        return Spacer(1, 1)
    max_cols = max(len(row) for row in rows)
    for row in rows:
        while len(row) < max_cols:
            row.append(Paragraph("", styles["SmallCustom"]))
    available = 170 * mm
    widths = [available / max_cols] * max_cols
    table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), BOLD_FONT),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def page_header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, height - 16 * mm, width - 20 * mm, height - 16 * mm)
        canvas.setFont(BOLD_FONT, 7)
        canvas.setFillColor(TEAL)
        canvas.drawString(20 * mm, height - 12 * mm, "TOKENHARVEST")
        canvas.setFont(BODY_FONT, 7)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 20 * mm, height - 12 * mm, "Tea Producer → Marketplace Integration")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)
    canvas.setFont(BODY_FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 9 * mm, "Integration documentation • August 2026")
    canvas.drawRightString(width - 20 * mm, 9 * mm, f"{doc.page}")
    canvas.restoreState()


def parse_markdown(text):
    lines = text.splitlines()
    story = []
    toc = []
    i = 0
    first_h1 = True
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("# "):
            title = line[2:].strip()
            if first_h1:
                story.append(Spacer(1, 5 * mm))
                story.append(Paragraph(inline_markup(title), styles["DocTitle"]))
                first_h1 = False
            else:
                story.append(Paragraph(inline_markup(title), styles["H1Custom"]))
            i += 1
            continue
        if line.startswith("## "):
            title = line[3:].strip()
            toc.append(title)
            story.append(Paragraph(inline_markup(title), styles["H1Custom"]))
            i += 1
            continue
        if line.startswith("### "):
            story.append(Paragraph(inline_markup(line[4:].strip()), styles["H2Custom"]))
            i += 1
            continue
        if line.startswith("#### "):
            story.append(Paragraph(inline_markup(line[5:].strip()), styles["H3Custom"]))
            i += 1
            continue
        if line.startswith("```"):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            block = Preformatted("\n".join(code), styles["CodeCustom"], maxLineLength=105)
            box = Table([[block]], colWidths=[170 * mm])
            box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(box)
            story.append(Spacer(1, 2))
            continue
        if line.startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            story.append(markdown_table(table_lines))
            story.append(Spacer(1, 4))
            continue
        if line.startswith(">"):
            callout = line[1:].strip()
            story.append(Table(
                [[Paragraph(inline_markup(callout), styles["Callout"])]],
                colWidths=[170 * mm],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), PALE_TEAL),
                    ("LINEBEFORE", (0, 0), (0, -1), 3, TEAL),
                    ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#B2F5EA")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]),
            ))
            i += 1
            continue
        if re.match(r"^\s*[-*]\s+", line):
            while i < len(lines) and re.match(r"^\s*[-*]\s+", lines[i]):
                text_line = re.sub(r"^\s*[-*]\s+", "", lines[i])
                story.append(Paragraph("• " + inline_markup(text_line), styles["BulletCustom"]))
                i += 1
            continue
        if re.match(r"^\s*\d+\.\s+", line):
            number = 1
            while i < len(lines) and re.match(r"^\s*\d+\.\s+", lines[i]):
                text_line = re.sub(r"^\s*\d+\.\s+", "", lines[i])
                story.append(Paragraph(f"{number}. {inline_markup(text_line)}", styles["BulletCustom"]))
                number += 1
                i += 1
            continue
        para = [line.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not (
            lines[i].startswith(("#", ">", "|", "```"))
            or re.match(r"^\s*[-*]\s+", lines[i])
            or re.match(r"^\s*\d+\.\s+", lines[i])
        ):
            para.append(lines[i].strip())
            i += 1
        story.append(Paragraph(inline_markup(" ".join(para)), styles["BodyCustom"]))
    return story, toc


def build():
    source = SOURCE.read_text(encoding="utf-8")
    content, toc = parse_markdown(source)
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=23 * mm,
        bottomMargin=20 * mm,
        title="Tea Producer Portal — Marketplace Integration Guide",
        author="TokenHarvest",
        subject="Direct and broker-mediated tea marketplace listing integration",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=page_header_footer)])

    cover = [
        Spacer(1, 24 * mm),
        Table([["TOKENHARVEST"]], colWidths=[170 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), BOLD_FONT),
            ("FONTSIZE", (0, 0), (-1, -1), 11),
            ("LETTERSPACING", (0, 0), (-1, -1), 1.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ])),
        Spacer(1, 30 * mm),
        Paragraph("Tea Producer Portal", styles["DocTitle"]),
        Paragraph("Marketplace Integration Guide", styles["DocTitle"]),
        Spacer(1, 5 * mm),
        Paragraph("Direct listings, broker mandates, auction sessions, bidding, and settlement", styles["DocSubtitle"]),
        Spacer(1, 20 * mm),
        Table([
            [Paragraph("<b>Audience</b>", styles["BodyCustom"]), Paragraph("Tea producers, cooperatives, brokers, marketplace operators, and integration teams", styles["BodyCustom"])],
            [Paragraph("<b>Version</b>", styles["BodyCustom"]), Paragraph("August 2026", styles["BodyCustom"])],
            [Paragraph("<b>Authentication</b>", styles["BodyCustom"]), Paragraph("Clerk session / Bearer token", styles["BodyCustom"])],
        ], colWidths=[35 * mm, 135 * mm], style=TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])),
        Spacer(1, 25 * mm),
        Paragraph("This document describes the implemented integration contract between the Tea Producer Portal and the TokenHarvest marketplace, including direct producer listings and broker-mediated listings governed by mandates.", styles["BodyCustom"]),
        PageBreak(),
        Paragraph("Contents", styles["H1Custom"]),
    ]
    for index, item in enumerate(toc, 1):
        cover.append(Paragraph(f"{index}. {inline_markup(item)}", styles["TOCItem"]))
    cover.extend([Spacer(1, 8), PageBreak()])

    # Remove the source's title from the body because the cover already contains it.
    if content and isinstance(content[0], Spacer):
        content = content[1:]
    if content and isinstance(content[0], Paragraph):
        content = content[1:]
    doc.build(cover + content)
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build()