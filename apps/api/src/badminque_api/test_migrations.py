"""Tests for Alembic migrations and database schema declarations."""

from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from badminque_api.models import Base


def test_alembic_configuration_and_migration_chain() -> None:
    """Verifies that Alembic configuration and revision history are valid."""
    api_dir = Path(__file__).resolve().parent.parent.parent
    alembic_ini_path = api_dir / "alembic.ini"
    assert alembic_ini_path.exists(), "alembic.ini must exist in apps/api"

    config = Config(str(alembic_ini_path))
    config.set_main_option("script_location", str(api_dir / "alembic"))

    script_directory = ScriptDirectory.from_config(config)
    heads = script_directory.get_heads()

    assert len(heads) == 1, "There must be exactly one head revision in migrations"
    head_rev = heads[0]
    assert head_rev == "20261018_0001", "Head revision must be 20261018_0001"

    revision = script_directory.get_revision(head_rev)
    assert revision is not None
    assert revision.down_revision is None
    assert revision.module is not None
    assert hasattr(revision.module, "upgrade")
    assert hasattr(revision.module, "downgrade")


def test_declarative_models_match_schema() -> None:
    """Verifies all expected domain tables are declared in SQLAlchemy Base metadata."""
    expected_tables = {
        "clubs",
        "club_nights",
        "roster_players",
        "matches",
        "claim_tokens",
    }
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), (
        f"Missing tables in metadata: {expected_tables - actual_tables}"
    )

    # Verify chronological index on matches table
    matches_table = Base.metadata.tables["matches"]
    index_names = {idx.name for idx in matches_table.indexes}
    assert "ix_matches_chronological" in index_names
