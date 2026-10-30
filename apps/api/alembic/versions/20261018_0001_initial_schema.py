"""Initial database schema for Badminque MVP.

Revision ID: 20261018_0001
Revises: None
Create Date: 2026-10-18 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261018_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Clubs table
    op.create_table(
        "clubs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # 2. Club Nights table
    op.create_table(
        "club_nights",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "club_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clubs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(32), server_default="ACTIVE", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # 3. Roster Players table (Tricount model: auth_user_id nullable)
    op.create_table(
        "roster_players",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "club_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clubs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("auth_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("initial_tier", sa.String(32), nullable=True),
        sa.Column(
            "singles_rating", sa.Float(), server_default="1500.0", nullable=False
        ),
        sa.Column(
            "doubles_rating", sa.Float(), server_default="1500.0", nullable=False
        ),
        sa.Column(
            "singles_matches_played", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column(
            "doubles_matches_played", sa.Integer(), server_default="0", nullable=False
        ),
        sa.Column("status", sa.String(32), server_default="QUEUED", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # 4. Matches table with client UUID and chronological index
    op.create_table(
        "matches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "club_night_id",
            UUID(as_uuid=True),
            sa.ForeignKey("club_nights.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("court_id", sa.Integer(), nullable=False),
        sa.Column("discipline", sa.String(16), nullable=False),
        sa.Column("format", sa.String(16), nullable=False),
        sa.Column("team_a_player_ids", sa.JSON(), nullable=False),
        sa.Column("team_b_player_ids", sa.JSON(), nullable=False),
        sa.Column("team_a_scores", sa.JSON(), nullable=False),
        sa.Column("team_b_scores", sa.JSON(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sequence_num", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(16), server_default="SYNCED", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_matches_chronological",
        "matches",
        ["club_night_id", "recorded_at", "sequence_num"],
    )

    # 5. Claim Tokens table
    op.create_table(
        "claim_tokens",
        sa.Column("token", sa.String(64), primary_key=True),
        sa.Column(
            "roster_player_id",
            UUID(as_uuid=True),
            sa.ForeignKey("roster_players.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "club_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clubs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_claimed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("claim_tokens")
    op.drop_index("ix_matches_chronological", table_name="matches")
    op.drop_table("matches")
    op.drop_table("roster_players")
    op.drop_table("club_nights")
    op.drop_table("clubs")
