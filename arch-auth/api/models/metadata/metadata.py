from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from ..base import MetadataBase



class DeploymentFte(MetadataBase):
    __tablename__ = "deployment_fte"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    deployment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        unique=True,
    )
    avg_human_minutes_per_case: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    avg_cases_per_run: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )
    analyst_hourly_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    fte_hours_per_year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=2080,
    )
    confidence_level: Mapped[str | None] = mapped_column(
        String(16),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    extra_metadata: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

class DeploymentFteSnapshot(MetadataBase):
    """1 to 1 table with flow run id.
    
    Will probably serve as intermediate holding.
    """
    __tablename__ = "deployment_fte_snapshot"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    flow_run_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        unique=True,
    )
    deployment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
    )
    flow_run_start_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    flow_run_end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    flow_run_state_type: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )
    bot_run_time_seconds: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0"),
    )
    fte_items: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    fte_items_source: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
    )
    avg_human_minutes_per_case: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    avg_cases_per_run: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )
    analyst_hourly_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    fte_hours_per_year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    human_minutes: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    hours_saved: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    fte_saved: Mapped[Decimal] = mapped_column(
        Numeric(14, 6),
        nullable=False,
    )
    est_cost_avoided: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )
    extra_metadata: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


class DeploymentFteUpsertRequest(BaseModel):
    avg_human_minutes_per_case: float = Field(gt=0)
    avg_cases_per_run: float | None = Field(default=None, gt=0)
    analyst_hourly_cost: float = Field(ge=0)
    fte_hours_per_year: int = Field(default=2080, gt=0)
    confidence_level: str | None = Field(default=None, max_length=16)
    description: str | None = Field(default=None, max_length=2048)
    notes: str | None = None
    is_active: bool = True
    extra_metadata: dict[str, object] = Field(default_factory=dict)

    @field_validator("confidence_level", mode="before")
    @classmethod
    def normalize_confidence_level(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip().upper()
        if not normalized:
            return None

        if normalized not in {"LOW", "MEDIUM", "HIGH"}:
            raise ValueError("confidence_level must be one of LOW, MEDIUM, HIGH")
        return normalized


class DeploymentFteView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    deployment_id: str
    avg_human_minutes_per_case: float
    avg_cases_per_run: float | None = None
    analyst_hourly_cost: float
    fte_hours_per_year: int
    confidence_level: str | None = None
    description: str | None = None
    notes: str | None = None
    is_active: bool
    extra_metadata: dict[str, object] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    @field_validator("extra_metadata", mode="before")
    @classmethod
    def normalize_extra_metadata(cls, value: object) -> dict[str, object]:
        return value if isinstance(value, dict) else {}


class DeploymentFteSummaryRow(BaseModel):
    deployment_id: str
    deployment_name: str | None = None
    runs_completed: int = 0
    human_time_per_run_minutes: float | None = None
    avg_bot_time_minutes: float | None = None
    total_hours_saved: float | None = None
    fte_saved: float | None = None
    est_cost_avoided: float | None = None




class FlowRunNote(MetadataBase):
    __tablename__ = "flow_run_notes"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    flow_run_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        unique=True,
    )
    deployment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
    )
    note_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    updated_by_user_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    updated_by_username: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


class FlowRunNoteUpsertRequest(BaseModel):
    note_text: str = Field(min_length=1, max_length=12000)


class FlowRunNoteView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    flow_run_id: UUID
    deployment_id: UUID
    note_text: str
    updated_by_user_id: str | None = None
    updated_by_username: str | None = None
    created_at: datetime
    updated_at: datetime
