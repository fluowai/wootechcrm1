import json
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "scratch" / "tga-report-data.json"
OUT_DIR = ROOT / "output" / "pdf"
OUT_FILE = OUT_DIR / "relatorio-sdr-tga-marketing-2026-06.pdf"

TZ = ZoneInfo("America/Sao_Paulo")


def load_data():
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def parse_dt(value):
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(TZ)


def fmt_date(value):
    dt = parse_dt(value)
    return dt.strftime("%d/%m/%Y") if dt else "-"


def fmt_datetime(value):
    dt = parse_dt(value)
    return dt.strftime("%d/%m/%Y %H:%M") if dt else "-"


def pct(value):
    return f"{value}%"


def period_label(start, end):
    return f"{datetime.fromisoformat(start).strftime('%d/%m/%Y')} a {datetime.fromisoformat(end).strftime('%d/%m/%Y')}"


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=30,
            textColor=colors.HexColor("#152238"),
            alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#546179"),
            spaceAfter=14,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=20,
            textColor=colors.HexColor("#152238"),
            spaceBefore=8,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.4,
            leading=13,
            textColor=colors.HexColor("#344054"),
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#475467"),
        ),
        "small_bold": ParagraphStyle(
            "SmallBold",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor("#152238"),
        ),
        "metric_value": ParagraphStyle(
            "MetricValue",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=24,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#152238"),
        ),
        "metric_label": ParagraphStyle(
            "MetricLabel",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.3,
            leading=9,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#667085"),
        ),
    }


def para(text, style):
    return Paragraph(str(text).replace("\n", "<br/>"), style)


def metric_card(label, value, note, styles, bg="#F8FAFC"):
    return Table(
        [
            [para(value, styles["metric_value"])],
            [para(label.upper(), styles["metric_label"])],
            [para(note, styles["small"])],
        ],
        colWidths=[4.2 * cm],
        rowHeights=[0.9 * cm, 0.45 * cm, 0.8 * cm],
        style=[
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
            ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#D7DEE8")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ],
    )


def bar_table(title, values, styles, max_width_cm=11.0):
    if not values:
        return KeepTogether([para(title, styles["section"]), para("Sem dados para o período.", styles["body"])])

    max_value = max(values.values()) or 1
    rows = [[para(title, styles["small_bold"]), "", para("Qtd.", styles["small_bold"])]]
    for label, value in values.items():
        width = max(0.4, (value / max_value) * max_width_cm)
        bar = Table(
            [[""]],
            colWidths=[width * cm],
            rowHeights=[0.22 * cm],
            style=[
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#2F80ED")),
                ("BOX", (0, 0), (-1, -1), 0, colors.HexColor("#2F80ED")),
            ],
        )
        rows.append([para(datetime.fromisoformat(label).strftime("%d/%m"), styles["small"]), bar, para(str(value), styles["small_bold"])])
    table = Table(rows, colWidths=[1.6 * cm, max_width_cm * cm, 1.0 * cm])
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5EAF1")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2F5F9")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def simple_table(data, col_widths, header_bg="#152238", font_size=7.1):
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_bg)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), font_size),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), font_size),
                ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#344054")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D7DEE8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )
    return table


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = doc.pagesize
    canvas.setStrokeColor(colors.HexColor("#D7DEE8"))
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 1.25 * cm, width - doc.rightMargin, 1.25 * cm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#667085"))
    canvas.drawString(doc.leftMargin, 0.78 * cm, "Relatório SDR - TGA Marketing")
    canvas.drawRightString(width - doc.rightMargin, 0.78 * cm, f"Página {doc.page}")
    canvas.restoreState()


def build_pdf(data):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=landscape(A4),
        rightMargin=1.15 * cm,
        leftMargin=1.15 * cm,
        topMargin=1.05 * cm,
        bottomMargin=1.45 * cm,
        title="Relatório SDR - TGA Marketing",
        author="Nexus360",
    )
    story = []

    metrics = data["metrics"]
    period = data["period"]
    generated_at = parse_dt(data["generatedAt"]) or datetime.now(TZ)

    story.append(para("Relatório de Atividades SDR - TGA Marketing", styles["title"]))
    story.append(
        para(
            f"Período de ligações: {period_label(period['callStart'], period['callEnd'])} | "
            f"Retornos agendados: {period_label(period['returnStart'], period['returnEnd'])} | "
            f"Gerado em {generated_at.strftime('%d/%m/%Y %H:%M')}",
            styles["subtitle"],
        )
    )

    story.append(para("Resumo executivo", styles["section"]))
    story.append(
        para(
            "A operação trabalhou todos os leads de farmácias de manipulação presentes no kanban do cliente. "
            "As atividades registradas mostram cobertura integral de ligações, metade dos leads com manifestação de interesse "
            "e todos os interessados com retorno agendado na agenda SDR de Ana Cristina.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.25 * cm))

    cards = [
        metric_card("Leads no kanban", str(metrics["kanbanLeads"]), "Base trabalhada no funil", styles, "#F8FAFC"),
        metric_card("Ligações feitas", str(metrics["callActivities"]), f"Cobertura: {pct(metrics['callCoveragePct'])}", styles, "#EEF6FF"),
        metric_card("Interessados", str(metrics["interestedLeads"]), f"Taxa sobre ligações: {pct(metrics['interestRatePct'])}", styles, "#ECFDF3"),
        metric_card("Retornos agendados", str(metrics["scheduledReturns"]), f"Conversão agenda: {pct(metrics['scheduleRatePct'])}", styles, "#FFF7ED"),
        metric_card("SDR responsável", "Ana Cristina", "Agenda SDR vinculada", styles, "#F4F3FF"),
    ]
    story.append(Table([cards], colWidths=[4.7 * cm] * 5, style=[("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(Spacer(1, 0.45 * cm))

    funnel_data = [
        ["Etapa", "Volume", "Conversão da etapa", "Observação"],
        ["Leads no kanban", str(metrics["kanbanLeads"]), "100%", "Base operacional usada no relatório"],
        ["Ligações feitas", str(metrics["callActivities"]), pct(metrics["callCoveragePct"]), "Todos os leads receberam atividade de ligação"],
        ["Leads interessados", str(metrics["interestedLeads"]), pct(metrics["interestRatePct"]), "Demonstraram interesse e solicitaram retorno"],
        ["Retornos agendados", str(metrics["scheduledReturns"]), pct(metrics["scheduleRatePct"]), "Agendados na agenda SDR de Ana Cristina"],
    ]
    story.append(simple_table(funnel_data, [6.0 * cm, 3.0 * cm, 4.0 * cm, 13.5 * cm], font_size=8.2))
    story.append(Spacer(1, 0.35 * cm))

    calls_by_date = OrderedDict(sorted(data["callsByDate"].items()))
    returns_by_date = OrderedDict(sorted(data["returnsByDate"].items()))
    story.append(Table(
        [[bar_table("Ligações por data", calls_by_date, styles), bar_table("Retornos por data", returns_by_date, styles)]],
        colWidths=[13.7 * cm, 13.7 * cm],
        style=[("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 10)],
    ))

    story.append(PageBreak())
    story.append(para("Retornos agendados na agenda SDR", styles["section"]))
    story.append(
        para(
            "Abaixo estão os leads que demonstraram interesse e solicitaram retorno. Todos estão vinculados à usuária Ana Cristina, departamento SDR.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.25 * cm))
    event_rows = [["Data e hora", "Lead", "SDR", "Status", "Telefone"]]
    lead_by_id = {lead["id"]: lead for lead in data["workedLeads"]}
    for event in data["calendarEvents"]:
        lead = lead_by_id.get(event["leadId"], {})
        sdr = event.get("user") or {}
        event_rows.append([
            fmt_datetime(event["startDate"]),
            para(lead.get("name", "-"), styles["small"]),
            para(f"{sdr.get('name', '-') or '-'} ({sdr.get('department', '-') or '-'})", styles["small"]),
            "Agendado" if event.get("status") == "scheduled" else event.get("status", "-"),
            lead.get("phone") or "-",
        ])
    story.append(simple_table(event_rows, [3.6 * cm, 10.0 * cm, 5.2 * cm, 3.2 * cm, 4.4 * cm], font_size=7.4))

    story.append(PageBreak())
    story.append(para("Base completa trabalhada", styles["section"]))
    story.append(
        para(
            "Lista consolidada dos 34 leads do kanban com indicação de ligação, interesse e retorno agendado.",
            styles["body"],
        )
    )
    story.append(Spacer(1, 0.25 * cm))
    lead_rows = [["Lead", "Telefone", "Ligação", "Interesse", "Retorno"]]
    for lead in data["workedLeads"]:
        lead_rows.append([
            para(lead["name"], styles["small"]),
            lead.get("phone") or "-",
            fmt_date(lead.get("callDate")),
            "Sim" if lead.get("showedInterest") else "Não",
            fmt_datetime(lead.get("returnDate")),
        ])
    story.append(simple_table(lead_rows, [10.8 * cm, 4.1 * cm, 3.0 * cm, 2.6 * cm, 5.2 * cm], font_size=6.8))

    story.append(PageBreak())
    story.append(para("Leitura gerencial e próximos passos", styles["section"]))
    next_steps = [
        ["Prioridade", "Ação recomendada", "Objetivo"],
        ["Alta", "Executar os 17 retornos agendados entre 16/06 e 19/06.", "Converter interesse em diagnóstico/reunião comercial."],
        ["Alta", "Registrar resultado de cada retorno imediatamente na ficha.", "Separar leads quentes, mornos e sem resposta."],
        ["Média", "Criar segunda cadência para os 17 leads sem interesse registrado.", "Recuperar oportunidades que ainda não avançaram."],
        ["Média", "Usar objeções coletadas para ajustar o script SDR.", "Aumentar taxa de interessados no próximo ciclo."],
    ]
    story.append(simple_table(next_steps, [3.0 * cm, 14.0 * cm, 10.0 * cm], font_size=8.0))
    story.append(Spacer(1, 0.45 * cm))
    story.append(para("Notas de metodologia", styles["section"]))
    story.append(
        para(
            "O relatório considera apenas os registros presentes no CRM Nexus360 da organização TGA MARKETING. "
            "Foram contabilizadas atividades marcadas como ligação no período de 03/06/2026 a 15/06/2026, "
            "atividades de retorno/interesse e eventos de agenda vinculados aos respectivos leads no período de 16/06/2026 a 19/06/2026.",
            styles["body"],
        )
    )

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


if __name__ == "__main__":
    build_pdf(load_data())
    print(OUT_FILE)
