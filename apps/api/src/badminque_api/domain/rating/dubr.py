"""DUBR (Dynamic Universal Badminton Rating) domain scale conversions.

Conforms strictly to ADR 0002 Section 6 and architecture-methodology.md.
Pure Python standard library with zero external dependencies.
Deterministic, synchronous, zero side-effects.
"""

from enum import Enum

# DUBR scale constants per ADR 0002 Section 6
DUBR_BASE_RATING: float = 800.0
DUBR_DIVISOR: float = 400.0
DUBR_SCALE_MIN: float = 2.0
DUBR_SCALE_MAX: float = 7.0
ESTABLISHED_MATCH_THRESHOLD: int = 8


class SkillTier(str, Enum):
    """Cold-start 1-tap skill tier anchor for unrated roster players."""

    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"


TIER_ANCHORS: dict[SkillTier, dict[str, float]] = {
    SkillTier.BEGINNER: {"dubr": 2.500, "rating": 1000.0},
    SkillTier.INTERMEDIATE: {"dubr": 3.500, "rating": 1400.0},
    SkillTier.ADVANCED: {"dubr": 4.500, "rating": 1800.0},
}

DEFAULT_SKILL_TIER: SkillTier = SkillTier.INTERMEDIATE


def tier_to_dubr(tier: SkillTier | str) -> float:
    """Returns the calibrated decimal DUBR baseline for the given tier anchor."""
    tier_enum = SkillTier(tier)
    return TIER_ANCHORS[tier_enum]["dubr"]


def tier_to_rating(tier: SkillTier | str) -> float:
    """Returns the calibrated logistic rating baseline for the given tier anchor."""
    tier_enum = SkillTier(tier)
    return TIER_ANCHORS[tier_enum]["rating"]


def is_provisional(matches_played: int) -> bool:
    """Evaluates whether player is in provisional calibration period (< 8 matches)."""
    return matches_played < ESTABLISHED_MATCH_THRESHOLD


def rating_to_dubr(rating: float) -> float:
    """Convert logistic rating to user-facing 2.000–7.000 decimal DUBR.

    Mathematical formula (ADR 0002 Section 6):
        DUBR = 2.000 + (R - 800.0) / 400.0
    """
    return 2.0 + (rating - DUBR_BASE_RATING) / DUBR_DIVISOR


def dubr_to_rating(dubr: float) -> float:
    """Invert user-facing decimal DUBR back to logistic rating scale.

    Mathematical formula (ADR 0002 Section 6):
        R = 800.0 + (DUBR - 2.000) * 400.0
    """
    return DUBR_BASE_RATING + (dubr - 2.0) * DUBR_DIVISOR


def rating_delta_to_dubr_delta(delta: float) -> float:
    """Convert logistic rating delta into Delta DUBR adjustment.

    Mathematical formula (ADR 0002 Section 6):
        Delta DUBR = Delta R / 400.0
    """
    return delta / DUBR_DIVISOR


def format_dubr(value: float) -> str:
    """Format decimal DUBR to 3 decimal places (e.g. '3.500')."""
    return f"{value:.3f}"


def format_dubr_delta(delta: float) -> str:
    """Format Delta DUBR with explicit sign (e.g. '+0.085', '-0.060')."""
    sign = "+" if delta >= 0.0 else ""
    return f"{sign}{delta:.3f}"
