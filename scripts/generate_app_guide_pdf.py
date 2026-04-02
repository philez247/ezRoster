from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "ez-roster-app-guide.md"
OUTPUT = ROOT / "docs" / "ez-roster-app-guide.pdf"


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle(
            "GuideH1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0A316E"),
            spaceBefore=6,
            spaceAfter=8,
            alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "GuideH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0A316E"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "GuideH3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#163D73"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "GuideBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=colors.black,
            spaceBefore=0,
            spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "GuideBullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            leftIndent=12,
            firstLineIndent=-8,
            bulletIndent=0,
            spaceAfter=2,
        ),
    }


def format_inline(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("`", "")
    )


def build_story(markdown_text: str):
    styles = build_styles()
    story = []

    for raw_line in markdown_text.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            story.append(Spacer(1, 4))
            continue

        if stripped.startswith("# "):
            story.append(Paragraph(format_inline(stripped[2:]), styles["h1"]))
            continue
        if stripped.startswith("## "):
            story.append(Paragraph(format_inline(stripped[3:]), styles["h2"]))
            continue
        if stripped.startswith("### "):
            story.append(Paragraph(format_inline(stripped[4:]), styles["h3"]))
            continue
        if stripped.startswith("- "):
            story.append(Paragraph(format_inline(stripped[2:]), styles["bullet"], bulletText="•"))
            continue
        if stripped[:2].isdigit() and stripped[1:3] == ". ":
            story.append(Paragraph(format_inline(stripped[3:]), styles["bullet"], bulletText=f"{stripped[0]}."))
            continue

        story.append(Paragraph(format_inline(stripped), styles["body"]))

    return story


def main():
    markdown_text = SOURCE.read_text(encoding="utf-8")
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="EZ Roster App Guide",
        author="OpenAI Codex",
    )
    doc.build(build_story(markdown_text))
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
