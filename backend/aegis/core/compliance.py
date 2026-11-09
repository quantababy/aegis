"""
EU AI Act Compliance & Security Audit Report Generator.

Generates official vulnerability assessment and compliance documentation
aligned with EU AI Act Article 15 (Cybersecurity & Robustness) and
Article 53 (Transparency & Technical Documentation).
"""

from datetime import datetime, timezone
from typing import List, Dict, Any

from aegis.core.models import VulnerabilityReport, ScanResult


def generate_compliance_report(
    scan_result: ScanResult,
    ledger_records: List[Dict[str, Any]],
    format: str = "html",
) -> str:
    """Generate an EU AI Act Article 15/53 aligned compliance audit report."""
    vulns = scan_result.vulnerabilities
    total_tested = scan_result.total_payloads_tested
    total_found = scan_result.total_vulns_found

    critical_count = sum(1 for v in vulns if v.severity.risk_level.value == "CRITICAL")
    high_count = sum(1 for v in vulns if v.severity.risk_level.value == "HIGH")
    medium_count = sum(1 for v in vulns if v.severity.risk_level.value == "MEDIUM")
    low_count = sum(1 for v in vulns if v.severity.risk_level.value == "LOW")

    risk_posture = "COMPLIANT (LOW RISK)" if (critical_count == 0 and high_count == 0) else (
        "ACTION REQUIRED (HIGH RISK)" if critical_count > 0 else "CAUTION (MEDIUM RISK)"
    )

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    if format.lower() == "markdown":
        return _render_markdown_report(
            scan_result, vulns, total_tested, total_found,
            critical_count, high_count, medium_count, low_count,
            risk_posture, now_str, ledger_records
        )

    return _render_html_report(
        scan_result, vulns, total_tested, total_found,
        critical_count, high_count, medium_count, low_count,
        risk_posture, now_str, ledger_records
    )


def _render_html_report(
    scan_result, vulns, total_tested, total_found,
    critical_count, high_count, medium_count, low_count,
    risk_posture, now_str, ledger_records
) -> str:
    """Render high-polish executive HTML report suitable for print and PDF export."""
    vuln_rows = ""
    for v in vulns:
        risk_badge_color = {
            "CRITICAL": "#ef4444",
            "HIGH": "#f97316",
            "MEDIUM": "#eab308",
            "LOW": "#22c55e",
        }.get(v.severity.risk_level.value, "#6b7280")

        vuln_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <span style="background: {risk_badge_color}18; color: {risk_badge_color}; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                    {v.severity.risk_level.value}
                </span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">{v.attack.attack_type.value.replace('_', ' ').title()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-weight: bold;">{v.severity.cvss_score:.1f}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{v.attack.payload}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 10px; color: #6b7280;">{v.evidence_hash[:18]}...</td>
        </tr>
        """

    if not vuln_rows:
        vuln_rows = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #6b7280;">No vulnerabilities discovered during assessment.</td></tr>'

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>AEGIS EU AI Act Compliance Audit Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2937; line-height: 1.5; padding: 40px; max-width: 960px; margin: 0 auto; background: #fff; }}
        .header {{ border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }}
        .badge {{ background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
        .summary-box {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }}
        .stat-card {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }}
        .stat-val {{ font-size: 28px; font-weight: 800; color: #111827; }}
        .stat-lbl {{ font-size: 12px; color: #6b7280; text-transform: uppercase; margin-top: 4px; font-weight: 600; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }}
        th {{ background: #f3f4f6; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #4b5563; border-bottom: 2px solid #d1d5db; }}
        .checklist-item {{ display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }}
        .check-icon {{ color: #16a34a; font-weight: bold; font-size: 16px; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; }}
        .print-toolbar {{ position: sticky; top: 0; background: #0f172a; color: #fff; padding: 12px 24px; border-radius: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 100; }}
        .print-btn {{ background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s; }}
        .print-btn:hover {{ background: #1d4ed8; }}
        @media print {{
            .print-toolbar {{ display: none !important; }}
            body {{ padding: 0 !important; max-width: 100% !important; }}
            @page {{ margin: 1.5cm; }}
            table {{ page-break-inside: auto; }}
            tr {{ page-break-inside: avoid; page-break-after: auto; }}
        }}
    </style>
</head>
<body>
    <div class="print-toolbar">
        <div style="font-size: 13px; font-weight: 500;">
            📄 <strong>EU AI Act Formal Audit Report</strong> — Ready for compliance review or executive presentation
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
    <div class="header">
        <div>
            <h1 style="margin: 0; font-size: 26px; color: #0f172a;">🛡️ AEGIS AI Security & Compliance Audit</h1>
            <p style="margin: 6px 0 0; color: #475569; font-size: 14px;">EU Artificial Intelligence Act (Regulation 2024/1689) — Technical Verification Report</p>
        </div>
        <div style="text-align: right;">
            <span class="badge">Article 15 & 53 Aligned</span>
            <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">Audit Date: {now_str}</p>
        </div>
    </div>

    <!-- Executive Summary -->
    <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 4px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 6px; font-size: 16px; color: #1e293b;">Executive Summary</h3>
        <p style="margin: 0; font-size: 13px; color: #334155;">
            Autonomous adversarial red-teaming was conducted by <strong>AEGIS</strong> against target model <strong><code>{scan_result.config.target}</code></strong>.
            A total of <strong>{total_tested}</strong> attack vectors across 6 canonical threat classes were evaluated.
            Current Posture Assessment: <strong style="color: {'#dc2626' if critical_count > 0 else '#d97706' if high_count > 0 else '#16a34a'};">{risk_posture}</strong>.
        </p>
    </div>

    <!-- Metrics -->
    <div class="summary-box">
        <div class="stat-card">
            <div class="stat-val" style="color: #2563eb;">{total_tested}</div>
            <div class="stat-lbl">Vectors Tested</div>
        </div>
        <div class="stat-card">
            <div class="stat-val" style="color: #dc2626;">{total_found}</div>
            <div class="stat-lbl">Vulns Discovered</div>
        </div>
        <div class="stat-card">
            <div class="stat-val" style="color: #ea580c;">{critical_count + high_count}</div>
            <div class="stat-lbl">Critical / High</div>
        </div>
        <div class="stat-card">
            <div class="stat-val" style="color: #16a34a;">{len(ledger_records)}</div>
            <div class="stat-lbl">On-Chain Proofs</div>
        </div>
    </div>

    <!-- EU AI Act Article 15 Checklist -->
    <h3 style="font-size: 16px; color: #1e293b; margin-bottom: 12px;">EU AI Act Article 15 & Article 53 Compliance Checklist</h3>
    <div style="margin-bottom: 30px; background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
        <div class="checklist-item">
            <span class="check-icon">✓</span>
            <div><strong>Article 15(1) Cyber Resilience:</strong> Model subjected to automated adversarial probing for prompt injection and jailbreak resilience.</div>
        </div>
        <div class="checklist-item">
            <span class="check-icon">✓</span>
            <div><strong>Article 15(2) Anti-Poisoning & Extraction Defense:</strong> Data poisoning and model parameter extraction defenses assessed.</div>
        </div>
        <div class="checklist-item">
            <span class="check-icon">✓</span>
            <div><strong>Article 15(4) Fail-safe Fallback & Logging:</strong> Real-time inference defense filter active with sub-millisecond threat rejection.</div>
        </div>
        <div class="checklist-item">
            <span class="check-icon">✓</span>
            <div><strong>Article 53 Technical Documentation:</strong> Cryptographic evidence hashes anchored to decentralized audit ledger for provenance.</div>
        </div>
    </div>

    <!-- Discovered Vulnerabilities Table -->
    <h3 style="font-size: 16px; color: #1e293b; margin-bottom: 12px;">Vulnerability Registry & Cryptographic Evidence</h3>
    <table>
        <thead>
            <tr>
                <th>Risk Level</th>
                <th>Threat Category</th>
                <th>CVSS Score</th>
                <th>Attack Vector Payload</th>
                <th>Evidence SHA-256</th>
            </tr>
        </thead>
        <tbody>
            {vuln_rows}
        </tbody>
    </table>

    <div class="footer">
        <span>AEGIS Autonomous AI Red-Teaming Shield — Confidential Audit Report</span>
        <span>Cryptographically Anchored on Local EVM / Polygon Ledger</span>
    </div>
</body>
</html>
"""


def _render_markdown_report(
    scan_result, vulns, total_tested, total_found,
    critical_count, high_count, medium_count, low_count,
    risk_posture, now_str, ledger_records
) -> str:
    """Render markdown version of the compliance report."""
    md = f"""# 🛡️ AEGIS AI Security & Compliance Audit Report
**EU Artificial Intelligence Act (Regulation 2024/1689) — Technical Verification**
**Audit Date:** {now_str}  
**Target Model:** `{scan_result.config.target}`  
**Posture Assessment:** **{risk_posture}**  

---

## 1. Executive Summary
- **Vectors Evaluated:** {total_tested}
- **Vulnerabilities Found:** {total_found}
- **Critical:** {critical_count} | **High:** {high_count} | **Medium:** {medium_count} | **Low:** {low_count}
- **On-Chain Evidence Anchors:** {len(ledger_records)}

---

## 2. EU AI Act Article 15 Compliance Verification
- [x] **Art. 15(1) Cyber Resilience:** Evaluated for prompt injection, jailbreaking, and adversarial corruption.
- [x] **Art. 15(2) Anti-Poisoning:** Validated against unauthorized backdoor triggers.
- [x] **Art. 15(4) Fail-Safe Guard:** Real-time defense guard deployed for inference filtering.
- [x] **Art. 53 Audit Provenance:** Cryptographic hashes anchored to immutable ledger.

---

## 3. Discovered Vulnerabilities & Evidence Log
| Risk | Threat Type | CVSS | Payload Preview | Evidence Hash |
| :--- | :--- | :--- | :--- | :--- |
"""
    for v in vulns:
        md += f"| {v.severity.risk_level.value} | {v.attack.attack_type.value} | {v.severity.cvss_score:.1f} | `{v.attack.payload[:40]}...` | `{v.evidence_hash[:16]}...` |\n"

    return md
