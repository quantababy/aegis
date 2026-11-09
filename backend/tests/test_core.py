"""
Tests for core module — schemas, taxonomy, and config.

Verifies model construction, enum completeness, seed data integrity,
and severity-level derivation logic.
"""

import pytest
from aegis.core.models import (
    AttackType, RiskLevel, AttackRecord, SeverityScore,
    VulnerabilityReport, ScanConfig, ScanResult,
)
from aegis.core.taxonomy import ATTACK_FAMILY_META, get_seed_attacks
from aegis.core import config


class TestAttackType:
    """Verify the 6-class attack enum is complete and consistent."""

    def test_has_six_types(self):
        assert len(AttackType) == 6

    def test_all_types_are_strings(self):
        for t in AttackType:
            assert isinstance(t.value, str)

    def test_expected_members(self):
        expected = {
            "prompt_injection", "jailbreak", "adversarial_perturbation",
            "data_poisoning", "model_extraction", "membership_inference",
        }
        assert {t.value for t in AttackType} == expected


class TestAttackRecord:
    """Verify attack record construction and field constraints."""

    def test_basic_construction(self):
        rec = AttackRecord(
            payload="test payload",
            attack_type=AttackType.JAILBREAK,
            severity=7.5,
        )
        assert rec.payload == "test payload"
        assert rec.attack_type == AttackType.JAILBREAK
        assert rec.severity == 7.5
        assert rec.generation == 0
        assert rec.parent_id is None

    def test_id_auto_generated(self):
        r1 = AttackRecord(payload="a", attack_type=AttackType.JAILBREAK)
        r2 = AttackRecord(payload="b", attack_type=AttackType.JAILBREAK)
        assert r1.id != r2.id

    def test_severity_bounds(self):
        with pytest.raises(Exception):
            AttackRecord(payload="x", attack_type=AttackType.JAILBREAK, severity=11.0)
        with pytest.raises(Exception):
            AttackRecord(payload="x", attack_type=AttackType.JAILBREAK, severity=-1.0)


class TestSeverityScore:
    """Verify ML severity output and risk level derivation."""

    @pytest.mark.parametrize("cvss,expected_level", [
        (2.0, RiskLevel.LOW),
        (5.5, RiskLevel.MEDIUM),
        (7.5, RiskLevel.HIGH),
        (9.5, RiskLevel.CRITICAL),
    ])
    def test_risk_level_derivation(self, cvss, expected_level):
        score = SeverityScore.from_cvss(
            predicted_type=AttackType.PROMPT_INJECTION,
            confidence=0.9,
            cvss=cvss,
        )
        assert score.risk_level == expected_level
        assert score.cvss_score == cvss

    def test_boundary_values(self):
        # 9.0 exactly should be CRITICAL
        s = SeverityScore.from_cvss(AttackType.JAILBREAK, 0.8, 9.0)
        assert s.risk_level == RiskLevel.CRITICAL

        # 6.9 should be MEDIUM
        s = SeverityScore.from_cvss(AttackType.JAILBREAK, 0.8, 6.9)
        assert s.risk_level == RiskLevel.MEDIUM


class TestTaxonomy:
    """Verify seed attack database and family metadata."""

    def test_all_families_have_metadata(self):
        for attack_type in AttackType:
            assert attack_type in ATTACK_FAMILY_META
            meta = ATTACK_FAMILY_META[attack_type]
            assert "name" in meta
            assert "description" in meta
            assert "color" in meta

    def test_seed_attacks_not_empty(self):
        seeds = get_seed_attacks()
        assert len(seeds) >= 20  # At least 20 seeds across families

    def test_seed_attacks_cover_all_families(self):
        seeds = get_seed_attacks()
        families_present = {s.attack_type for s in seeds}
        assert families_present == set(AttackType)

    def test_seed_attacks_have_valid_severity(self):
        for seed in get_seed_attacks():
            assert 0.0 <= seed.severity <= 10.0

    def test_seed_attacks_are_generation_zero(self):
        for seed in get_seed_attacks():
            assert seed.generation == 0
            assert seed.parent_id is None


class TestConfig:
    """Verify config constants are sensible."""

    def test_bloom_filter_size_positive(self):
        assert config.BLOOM_FILTER_SIZE > 0
        assert config.BLOOM_FILTER_HASH_COUNT > 0

    def test_thresholds_in_range(self):
        assert 0.0 <= config.GUARD_BLOCK_THRESHOLD <= 1.0
        assert 0.0 <= config.GUARD_LOG_THRESHOLD <= 1.0
        assert config.GUARD_LOG_THRESHOLD <= config.GUARD_BLOCK_THRESHOLD
