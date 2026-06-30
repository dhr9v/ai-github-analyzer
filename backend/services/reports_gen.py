import os
import json
from typing import List, Dict, Any

Analysis = Any
Issue = Any
Repository = Any
# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class ReportGeneratorService:
    @staticmethod
    def generate_json(analysis: Analysis, issues: List[Issue], repo_name: str) -> str:
        """
        Serializes analysis data and issues into standard JSON structure.
        """
        data = {
            "repository": repo_name,
            "analysis_id": analysis.id,
            "date": analysis.created_at.isoformat() if analysis.created_at else None,
            "commit_hash": analysis.commit_hash,
            "branch": analysis.branch,
            "scores": {
                "overall": analysis.overall_score,
                "security": analysis.security_score,
                "performance": analysis.performance_score,
                "maintainability": analysis.maintainability_score,
                "documentation": analysis.documentation_score,
                "testing": analysis.testing_score,
                "architecture": analysis.architecture_score
            },
            "executive_summary": analysis.executive_summary,
            "strengths": analysis.strengths or [],
            "weaknesses": analysis.weaknesses or [],
            "refactoring_suggestions": analysis.refactoring_suggestions or [],
            "issues": [
                {
                    "id": i.id,
                    "file_path": i.file_path,
                    "line_number": i.line_number,
                    "category": i.category,
                    "severity": i.severity,
                    "tool": i.tool,
                    "message": i.message,
                    "suggested_fix": i.suggested_fix
                } for i in issues
            ]
        }
        return json.dumps(data, indent=2)

    @staticmethod
    def generate_md(analysis: Analysis, issues: List[Issue], repo_name: str) -> str:
        """
        Compiles analysis findings into a professional markdown document.
        """
        md = []
        md.append(f"# AI Code Review Report: {repo_name}")
        md.append(f"- **Analysis Date:** {analysis.created_at.strftime('%Y-%m-%d %H:%M:%S') if analysis.created_at else 'N/A'}")
        md.append(f"- **Target Branch:** `{analysis.branch}`")
        md.append(f"- **Commit Hash:** `{analysis.commit_hash or 'N/A'}`")
        md.append("")
        
        # Scores block
        md.append("## Health Scores")
        md.append("| Category | Score (0-100) |")
        md.append("| --- | --- |")
        md.append(f"| **Overall Health** | **{analysis.overall_score}** |")
        md.append(f"| Security | {analysis.security_score} |")
        md.append(f"| Performance | {analysis.performance_score} |")
        md.append(f"| Maintainability | {analysis.maintainability_score} |")
        md.append(f"| Documentation | {analysis.documentation_score} |")
        md.append(f"| Testing | {analysis.testing_score} |")
        md.append(f"| Architecture | {analysis.architecture_score} |")
        md.append("")
        
        # Summary
        md.append("## Executive Summary")
        md.append(analysis.executive_summary or "No executive summary available.")
        md.append("")
        
        # Strengths & Weaknesses
        md.append("## Strengths")
        for s in (analysis.strengths or []):
            md.append(f"- {s}")
        if not analysis.strengths:
            md.append("- No key strengths recorded.")
        md.append("")
        
        md.append("## Weaknesses")
        for w in (analysis.weaknesses or []):
            md.append(f"- {w}")
        if not analysis.weaknesses:
            md.append("- No major weaknesses recorded.")
        md.append("")
        
        # Recommendations
        md.append("## Refactoring Recommendations")
        for rec in (analysis.refactoring_suggestions or []):
            md.append(f"- {rec}")
        if not analysis.refactoring_suggestions:
            md.append("- No recommendations recorded.")
        md.append("")
        
        # Issues List
        md.append("## Detailed Issues Audit")
        if not issues:
            md.append("No critical issues detected in this review cycle.")
        else:
            md.append("| File | Line | Category | Severity | Tool | Message |")
            md.append("| --- | --- | --- | --- | --- | --- |")
            for i in issues:
                line = i.line_number if i.line_number else "-"
                msg_clean = i.message.replace("\n", " ")
                md.append(f"| `{i.file_path}` | {line} | {i.category.upper()} | {i.severity.upper()} | {i.tool.upper()} | {msg_clean} |")
                
        return "\n".join(md)

    @classmethod
    def generate_html(cls, analysis: Analysis, issues: List[Issue], repo_name: str) -> str:
        """
        Compiles findings into styled HTML template, resembling a premium layout.
        """
        md_content = cls.generate_md(analysis, issues, repo_name)
        # Simplified conversion with styling
        issues_rows = ""
        for i in issues:
            severity_class = "severity-critical" if i.severity == "critical" else "severity-warning" if i.severity == "warning" else "severity-info"
            issues_rows += f"""
            <tr>
                <td><code>{i.file_path}</code></td>
                <td>{i.line_number or '-'}</td>
                <td><span class="badge badge-category">{i.category}</span></td>
                <td><span class="badge {severity_class}">{i.severity}</span></td>
                <td>{i.tool}</td>
                <td>{i.message}</td>
            </tr>
            """

        strengths_li = "".join(f"<li>{s}</li>" for s in (analysis.strengths or []))
        weaknesses_li = "".join(f"<li>{w}</li>" for w in (analysis.weaknesses or []))
        recommendations_li = "".join(f"<li>{r}</li>" for r in (analysis.refactoring_suggestions or []))

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Code Review Report: {repo_name}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background-color: #0d1117;
                    color: #c9d1d9;
                    margin: 0;
                    padding: 40px;
                }}
                .container {{
                    max-width: 1000px;
                    margin: 0 auto;
                    background-color: #161b22;
                    border: 1px solid #30363d;
                    border-radius: 12px;
                    padding: 40px;
                }}
                h1, h2, h3 {{
                    color: #f0f6fc;
                    border-bottom: 1px solid #30363d;
                    padding-bottom: 8px;
                }}
                h1 {{ border-bottom: 2px solid #58a6ff; }}
                .meta-table, .issues-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }}
                .meta-table td, .meta-table th, .issues-table td, .issues-table th {{
                    border: 1px solid #30363d;
                    padding: 12px;
                    text-align: left;
                }}
                .issues-table th {{ background-color: #21262d; }}
                .badge {{
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    display: inline-block;
                }}
                .severity-critical {{ background-color: #f85149; color: #fff; }}
                .severity-warning {{ background-color: #d29922; color: #0d1117; }}
                .severity-info {{ background-color: #388bfd; color: #fff; }}
                .badge-category {{ background-color: #30363d; color: #c9d1d9; }}
                code {{
                    font-family: ui-monospace, SFMono-Regular, SF Pro Text, monospace;
                    background-color: #21262d;
                    padding: 2px 6px;
                    border-radius: 4px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>AI Code Review Report: {repo_name}</h1>
                <table class="meta-table">
                    <tr>
                        <th>Branch</th><td><code>{analysis.branch}</code></td>
                        <th>Overall Score</th><td><strong>{analysis.overall_score}/100</strong></td>
                    </tr>
                    <tr>
                        <th>Commit</th><td><code>{analysis.commit_hash or 'N/A'}</code></td>
                        <th>Date</th><td>{analysis.created_at.strftime('%Y-%m-%d %H:%M:%S') if analysis.created_at else 'N/A'}</td>
                    </tr>
                </table>

                <h2>Executive Summary</h2>
                <p>{analysis.executive_summary or 'No executive summary.'}</p>

                <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                    <div style="flex: 1; background: #21262d; padding: 20px; border-radius: 8px;">
                        <h3>Strengths</h3>
                        <ul>{strengths_li or '<li>None</li>'}</ul>
                    </div>
                    <div style="flex: 1; background: #21262d; padding: 20px; border-radius: 8px;">
                        <h3>Weaknesses</h3>
                        <ul>{weaknesses_li or '<li>None</li>'}</ul>
                    </div>
                </div>

                <h2>Refactoring Recommendations</h2>
                <ul>{recommendations_li or '<li>None</li>'}</ul>

                <h2>Detailed Audit Log</h2>
                <table class="issues-table">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Line</th>
                            <th>Category</th>
                            <th>Severity</th>
                            <th>Tool</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {issues_rows}
                    </tbody>
                </table>
            </div>
        </body>
        </html>
        """
        return html

    @staticmethod
    def generate_pdf(analysis: Analysis, issues: List[Issue], repo_name: str, dest_path: str):
        """
        Generates a premium typeset PDF document using ReportLab.
        """
        # Create document template
        doc = SimpleDocTemplate(
            dest_path,
            pagesize=letter,
            rightMargin=40, leftMargin=40,
            topMargin=40, bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Define brand styles
        title_style = ParagraphStyle(
            'PDFTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=15
        )
        h2_style = ParagraphStyle(
            'PDFH2',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=15,
            spaceAfter=10
        )
        body_style = ParagraphStyle(
            'PDFBody',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#334155'),
            spaceAfter=8,
            leading=14
        )

        story = []

        # Cover page title
        story.append(Paragraph(f"AI Code Review: {repo_name}", title_style))
        story.append(Spacer(1, 10))

        # Metadata table
        meta_data = [
            ["Repository:", repo_name, "Date:", analysis.created_at.strftime('%Y-%m-%d %H:%M:%S') if analysis.created_at else 'N/A'],
            ["Branch:", analysis.branch, "Commit:", analysis.commit_hash[:10] if analysis.commit_hash else 'N/A'],
            ["Overall Score:", f"{analysis.overall_score}/100", "Vulnerabilities:", f"{len(issues)} detected"]
        ]
        meta_table = Table(meta_data, colWidths=[90, 170, 90, 170])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#475569')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 20))

        # Executive Summary
        story.append(Paragraph("Executive Summary", h2_style))
        story.append(Paragraph(analysis.executive_summary or "No summary.", body_style))
        story.append(Spacer(1, 15))

        # Scores Table
        story.append(Paragraph("Health Metrics breakdown", h2_style))
        scores_data = [
            ["Security Score:", f"{analysis.security_score}/100", "Documentation Score:", f"{analysis.documentation_score}/100"],
            ["Performance Score:", f"{analysis.performance_score}/100", "Testing Score:", f"{analysis.testing_score}/100"],
            ["Maintainability Score:", f"{analysis.maintainability_score}/100", "Architecture Score:", f"{analysis.architecture_score}/100"]
        ]
        scores_table = Table(scores_data, colWidths=[130, 130, 130, 130])
        scores_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1E293B')),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(scores_table)
        story.append(Spacer(1, 20))

        # Strengths & Weaknesses
        story.append(Paragraph("Key Strengths", h2_style))
        for s in (analysis.strengths or []):
            story.append(Paragraph(f"• {s}", body_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph("Key Weaknesses", h2_style))
        for w in (analysis.weaknesses or []):
            story.append(Paragraph(f"• {w}", body_style))
        story.append(Spacer(1, 20))

        # Page break before Issues
        story.append(PageBreak())
        story.append(Paragraph("Detailed Issues Audit Log", h2_style))

        # Build issues table
        issues_header = ["File", "Line", "Category", "Sev", "Tool", "Message"]
        issues_rows = [issues_header]
        for i in issues:
            # Shorten message
            msg = i.message
            if len(msg) > 75:
                msg = msg[:72] + "..."
            
            # Shorten filepath
            fpath = i.file_path
            if len(fpath) > 25:
                fpath = "..." + fpath[-22:]
                
            issues_rows.append([
                fpath,
                str(i.line_number or "-"),
                i.category.upper(),
                i.severity.upper(),
                i.tool.upper(),
                msg
            ])

        # Table sizing
        issues_table = Table(issues_rows, colWidths=[100, 30, 70, 50, 50, 220])
        issues_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        
        # Highlight critical lines
        for idx, row in enumerate(issues_rows[1:], start=1):
            if row[3] == "CRITICAL":
                issues_table.setStyle(TableStyle([
                    ('TEXTCOLOR', (3, idx), (3, idx), colors.red),
                    ('FONTNAME', (3, idx), (3, idx), 'Helvetica-Bold')
                ]))

        story.append(issues_table)
        
        # Build Document
        doc.build(story)
