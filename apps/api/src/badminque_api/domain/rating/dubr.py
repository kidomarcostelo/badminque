"""DUBR (Dynamic Universal Badminton Rating) domain scale conversions.

Conforms strictly to ADR 0002 Section 6 and architecture-methodology.md.
Pure Python standard library with zero external dependencies.
Deterministic, synchronous, zero side-effects.
"""

# DUBR scale constants per ADR 0002 Section 6
DUBR_BASE_RATING: float = 800.0
DUBR_DIVISOR: float = 400.0
DUBR_SCALE_MIN: float = 2.0
DUBR_SCALE_MAX: float = 7.0


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
