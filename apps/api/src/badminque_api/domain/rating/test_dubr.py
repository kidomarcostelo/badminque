"""Colocated tests for DUBR rating scale conversions and formatting.

Conforms strictly to ADR 0002 Section 6 and CODING_STANDARDS.md Section 1.5.
"""

import pytest

from badminque_api.domain.rating.dubr import (
    DEFAULT_SKILL_TIER,
    DUBR_BASE_RATING,
    DUBR_DIVISOR,
    DUBR_SCALE_MAX,
    DUBR_SCALE_MIN,
    TIER_ANCHORS,
    SkillTier,
    dubr_to_rating,
    format_dubr,
    format_dubr_delta,
    is_provisional,
    rating_delta_to_dubr_delta,
    rating_to_dubr,
    tier_to_dubr,
    tier_to_rating,
)
from badminque_api.domain.rating.engine import RatingDeltaResult


def test_dubr_scale_constants() -> None:
    """Verifies DUBR mathematical constants match ADR 0002 specification."""
    assert DUBR_BASE_RATING == 800.0
    assert DUBR_DIVISOR == 400.0
    assert DUBR_SCALE_MIN == 2.0
    assert DUBR_SCALE_MAX == 7.0


def test_rating_to_dubr_mapping() -> None:
    """Verifies DUBR = 2.000 + (R - 800) / 400 linear mapping."""
    assert rating_to_dubr(800.0) == pytest.approx(2.0, abs=1e-5)
    assert rating_to_dubr(1000.0) == pytest.approx(2.5, abs=1e-5)
    assert rating_to_dubr(1500.0) == pytest.approx(3.75, abs=1e-5)
    assert rating_to_dubr(2800.0) == pytest.approx(7.0, abs=1e-5)


def test_dubr_to_rating_inverse_mapping() -> None:
    """Verifies R = 800 + (DUBR - 2.0) * 400 exact inverse mapping."""
    assert dubr_to_rating(2.0) == pytest.approx(800.0, abs=1e-5)
    assert dubr_to_rating(2.5) == pytest.approx(1000.0, abs=1e-5)
    assert dubr_to_rating(3.75) == pytest.approx(1500.0, abs=1e-5)
    assert dubr_to_rating(7.0) == pytest.approx(2800.0, abs=1e-5)


def test_rating_delta_to_dubr_delta() -> None:
    """Verifies Delta DUBR = Delta R / 400 scaling with 3 decimal precision."""
    assert rating_delta_to_dubr_delta(34.0) == pytest.approx(0.085, abs=1e-5)
    assert rating_delta_to_dubr_delta(-24.0) == pytest.approx(-0.060, abs=1e-5)
    assert rating_delta_to_dubr_delta(0.0) == pytest.approx(0.0, abs=1e-5)


def test_format_dubr() -> None:
    """Verifies 3-decimal place formatting for user-facing DUBR."""
    assert format_dubr(3.5) == "3.500"
    assert format_dubr(3.75) == "3.750"
    assert format_dubr(2.0) == "2.000"
    assert format_dubr(7.0) == "7.000"


def test_format_dubr_delta() -> None:
    """Verifies explicit sign formatting for Delta DUBR adjustments."""
    assert format_dubr_delta(0.085) == "+0.085"
    assert format_dubr_delta(-0.060) == "-0.060"
    assert format_dubr_delta(0.0) == "+0.000"


def test_rating_delta_result_dubr_properties() -> None:
    """Verifies pre_dubr, post_dubr, and dubr_delta properties on RatingDeltaResult."""
    result = RatingDeltaResult(
        player_id="player-123",
        pre_rating=1500.0,
        post_rating=1534.0,
        rating_delta=34.0,
        k_factor=64.0,
        rd_after=350.0,
        is_provisional=True,
    )

    assert result.pre_dubr == pytest.approx(3.750, abs=1e-3)
    assert result.post_dubr == pytest.approx(3.835, abs=1e-3)
    assert result.dubr_delta == pytest.approx(0.085, abs=1e-3)


def test_skill_tier_anchors() -> None:
    """Verifies 3-way tier anchor values adhering to ADR 0002."""
    assert DEFAULT_SKILL_TIER == SkillTier.INTERMEDIATE

    # Beginner: 2.500 / 1000 rating
    assert TIER_ANCHORS[SkillTier.BEGINNER]["dubr"] == 2.500
    assert TIER_ANCHORS[SkillTier.BEGINNER]["rating"] == 1000.0
    assert tier_to_dubr(SkillTier.BEGINNER) == 2.500
    assert tier_to_rating(SkillTier.BEGINNER) == 1000.0
    assert rating_to_dubr(1000.0) == pytest.approx(2.500, abs=1e-5)

    # Intermediate: 3.500 / 1400 rating [Default]
    assert TIER_ANCHORS[SkillTier.INTERMEDIATE]["dubr"] == 3.500
    assert TIER_ANCHORS[SkillTier.INTERMEDIATE]["rating"] == 1400.0
    assert tier_to_dubr(SkillTier.INTERMEDIATE) == 3.500
    assert tier_to_rating(SkillTier.INTERMEDIATE) == 1400.0
    assert rating_to_dubr(1400.0) == pytest.approx(3.500, abs=1e-5)

    # Advanced: 4.500 / 1800 rating
    assert TIER_ANCHORS[SkillTier.ADVANCED]["dubr"] == 4.500
    assert TIER_ANCHORS[SkillTier.ADVANCED]["rating"] == 1800.0
    assert tier_to_dubr(SkillTier.ADVANCED) == 4.500
    assert tier_to_rating(SkillTier.ADVANCED) == 1800.0
    assert rating_to_dubr(1800.0) == pytest.approx(4.500, abs=1e-5)


def test_is_provisional() -> None:
    """Verifies calibration threshold (< 8 matches is provisional)."""
    assert is_provisional(0) is True
    assert is_provisional(1) is True
    assert is_provisional(7) is True
    assert is_provisional(8) is False
    assert is_provisional(15) is False
