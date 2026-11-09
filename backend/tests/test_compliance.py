"""
Tests for EU AI Act Compliance & Audit Report Generator.
"""

import pytest
from fastapi.testclient import TestClient

try:
    from backend.main import app
except ModuleNotFoundError:
    from main import app
from aegis.core.compliance import generate_compliance_report
from aegis.core.models import ScanConfig
from aegis.redteam.scanner import Scanner
from aegis.blockchain.ledger import MockLedger

client = TestClient(app)


class TestComplianceReporting:

    def test_generate_html_report(self):
        scanner = Scanner(config=ScanConfig(num_attacks=5))
        result = scanner.run()
        ledger = MockLedger()
        for v in result.vulnerabilities:
            ledger.record_vulnerability(v)

        html = generate_compliance_report(result, ledger.get_all_records(), format="html")
        assert "<!DOCTYPE html>" in html
        assert "EU Artificial Intelligence Act" in html
        assert "Article 15" in html
        assert "Article 53" in html

    def test_generate_markdown_report(self):
        scanner = Scanner(config=ScanConfig(num_attacks=5))
        result = scanner.run()
        ledger = MockLedger()

        md = generate_compliance_report(result, ledger.get_all_records(), format="markdown")
        assert "# 🛡️ AEGIS AI Security & Compliance Audit Report" in md
        assert "Article 15 Compliance Verification" in md

    def test_export_report_api_endpoint(self):
        res = client.get("/api/report/export?format=html")
        assert res.status_code == 200
        assert "text/html" in res.headers.get("content-type", "")
        assert "EU Artificial Intelligence Act" in res.text

    def test_export_report_markdown_endpoint(self):
        res = client.get("/api/report/export?format=markdown")
        assert res.status_code == 200
        assert "text/markdown" in res.headers.get("content-type", "")
        assert "# 🛡️ AEGIS" in res.text
