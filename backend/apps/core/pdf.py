import io
from decimal import Decimal
from django.conf import settings
from django.template.loader import render_to_string


def render_pdf(template_name: str, context: dict) -> bytes:
    """Renders PDF bytes using ReportLab, with WeasyPrint fallback."""
    try:
        if "receipt" in context:
            return _render_receipt_pdf(context)
        elif "p" in context and "emp" in context:
            return _render_payslip_pdf(context)
    except Exception:
        pass

    try:
        from weasyprint import HTML
        html = render_to_string(template_name, context)
        return HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()
    except Exception:
        return _render_generic_pdf(template_name, context)


def _render_receipt_pdf(context: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A5
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    receipt = context.get("receipt")
    txn = context.get("txn")
    fee = context.get("fee")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A5, rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()

    bold_style = ParagraphStyle('Bld', parent=styles['Normal'], fontSize=9, leading=12, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f172a'))
    norm_style = ParagraphStyle('Nrm', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.HexColor('#334155'))
    right_bold = ParagraphStyle('RB', parent=bold_style, alignment=2)
    right_norm = ParagraphStyle('RN', parent=norm_style, alignment=2)

    elements = []

    rcpt_no = receipt.receipt_number if receipt else "REC-2026-0001"
    dt_str = receipt.timestamp.strftime('%d %b %Y, %H:%M') if receipt and hasattr(receipt, 'timestamp') and receipt.timestamp else "-"
    header_data = [
        [
            Paragraph("<b>Apex University ERP</b><br/><font size=8 color='#64748b'>Official Tuition &amp; Educational Fee Receipt<br/>SAC: 9992 (Exempt from GST u/s 12/2017-CT)</font>", norm_style),
            Paragraph(f"<b>RECEIPT: {rcpt_no}</b><br/><font size=8 color='#64748b'>Date: {dt_str}<br/><font color='#059669'><b>STATUS: VERIFIED &amp; PAID</b></font></font>", right_norm),
        ]
    ]
    t_header = Table(header_data, colWidths=[230, 160])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, colors.HexColor('#0037b0')),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 10))

    student_name = fee.student.name if fee and fee.student else "-"
    roll_no = fee.student.roll_no if fee and fee.student else "-"
    course_name = f"{fee.course.name} ({fee.course.code})" if fee and fee.course else "-"
    acad_year = fee.academic_year if fee else "2026-27"
    quota_name = f"{fee.quota_category.name} ({fee.quota_category.waiver_percent}% Waiver)" if fee and fee.quota_category else "General"
    pay_mode = f"{txn.get_method_display() if hasattr(txn, 'get_method_display') else txn.method} via {txn.gateway.title()}" if txn else "Online"
    ref_id = (txn.gateway_txn_id or txn.order_id) if txn else "-"
    amt = float(txn.amount) if txn else 0.0

    body_data = [
        [Paragraph("Student Name", bold_style), Paragraph(student_name, right_bold)],
        [Paragraph("Enrollment / Roll No", norm_style), Paragraph(roll_no, right_norm)],
        [Paragraph("Academic Degree Program", norm_style), Paragraph(course_name, right_norm)],
        [Paragraph("Academic Session", norm_style), Paragraph(acad_year, right_norm)],
        [Paragraph("Admission / Quota Category", norm_style), Paragraph(quota_name, right_norm)],
        [Paragraph("Payment Mode & Gateway", norm_style), Paragraph(pay_mode, right_norm)],
        [Paragraph("Transaction Reference", norm_style), Paragraph(ref_id, right_norm)],
        [Paragraph("Tax Status (SAC Code: 9992)", norm_style), Paragraph("Exempt from GST (0.00)", right_norm)],
        [Paragraph("<b>Total Amount Paid</b>", ParagraphStyle('TotL', parent=bold_style, fontSize=11, leading=14, textColor=colors.HexColor('#0037b0'))),
         Paragraph(f"<b>Rs. {amt:,.2f}</b>", ParagraphStyle('TotR', parent=right_bold, fontSize=12, leading=14, textColor=colors.HexColor('#0037b0')))],
    ]

    t_body = Table(body_data, colWidths=[170, 220])
    t_body.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#f1f5f9')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#eff6ff')),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor('#0037b0')),
        ('TOPPADDING', (0, -1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 6),
    ]))
    elements.append(t_body)
    elements.append(Spacer(1, 12))

    compliance_text = (
        "<font size=7 color='#64748b'>"
        "<b>Tax &amp; Compliance Disclosure:</b> Education services provided to enrolled students are exempt from GST "
        "under SAC code 9992 pursuant to Entry 66 of Notification No. 12/2017-Central Tax. Tuition fee paid is "
        "eligible for deduction under Section 80C of the Income Tax Act, 1961.<br/><br/>"
        "<i>Digitally verified and system-stamped receipt. No physical signature required.</i>"
        "</font>"
    )
    elements.append(Paragraph(compliance_text, norm_style))
    doc.build(elements)
    return buf.getvalue()


def _render_payslip_pdf(context: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A5
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    p = context.get("p")
    emp = context.get("emp")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A5, rightMargin=24, leftMargin=24, topMargin=24, bottomMargin=24)
    styles = getSampleStyleSheet()
    bold_style = ParagraphStyle('Bld', parent=styles['Normal'], fontSize=9, leading=12, fontName='Helvetica-Bold')
    norm_style = ParagraphStyle('Nrm', parent=styles['Normal'], fontSize=9, leading=12)
    right_bold = ParagraphStyle('RB', parent=bold_style, alignment=2)
    right_norm = ParagraphStyle('RN', parent=norm_style, alignment=2)

    emp_name = getattr(emp, "name", None) or (emp.user.get_full_name() if hasattr(emp, "user") else "-")
    basic = float(getattr(p, "basic_salary", getattr(p, "basic_pay", 0)))
    gross = float(getattr(p, "gross_salary", getattr(p, "gross", 0)))
    pf = float(getattr(p, "pf", getattr(p, "pf_deduction", 0)))
    esi = float(getattr(p, "esi", getattr(p, "esi_deduction", 0)))
    tds = float(getattr(p, "tds", getattr(p, "tds_deduction", 0)))
    net = float(getattr(p, "net_salary", getattr(p, "net_pay", 0)))

    elements = [
        Paragraph("<b>Apex University ERP — Employee Salary Payslip</b>", ParagraphStyle('H1', parent=styles['Heading1'], fontSize=14, leading=16, textColor=colors.HexColor('#0037b0'))),
        Paragraph(f"Period: {getattr(p, 'month', '-')}/{getattr(p, 'year', '-')} • Employee: {emp_name}", norm_style),
        Spacer(1, 10),
    ]
    data = [
        [Paragraph("Basic Pay", norm_style), Paragraph(f"Rs. {basic:,.2f}", right_norm)],
        [Paragraph("Gross Salary", bold_style), Paragraph(f"Rs. {gross:,.2f}", right_bold)],
        [Paragraph("PF Deduction (12%)", norm_style), Paragraph(f"-Rs. {pf:,.2f}", right_norm)],
        [Paragraph("ESI Deduction (0.75%)", norm_style), Paragraph(f"-Rs. {esi:,.2f}", right_norm)],
        [Paragraph("TDS / Income Tax Deduction", norm_style), Paragraph(f"-Rs. {tds:,.2f}", right_norm)],
        [Paragraph("<b>Net Disbursed Salary</b>", ParagraphStyle('NL', parent=bold_style, fontSize=11, textColor=colors.HexColor('#059669'))),
         Paragraph(f"<b>Rs. {net:,.2f}</b>", ParagraphStyle('NR', parent=right_bold, fontSize=11, textColor=colors.HexColor('#059669')))],
    ]
    t = Table(data, colWidths=[200, 190])
    t.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)
    doc.build(elements)
    return buf.getvalue()


def _render_generic_pdf(template_name: str, context: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    doc.build([Paragraph("Apex ERP Document", getSampleStyleSheet()['Heading1'])])
    return buf.getvalue()
