from __future__ import annotations

import enum
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Interval,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from sqlalchemy.dialects.postgresql import JSON, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship

Base = declarative_base()


class DeploymentStatus(str, enum.Enum):
    READY = "READY"
    NOT_READY = "NOT_READY"


class StateType(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    CRASHED = "CRASHED"
    PAUSED = "PAUSED"
    CANCELLING = "CANCELLING"


class WorkPoolStatus(str, enum.Enum):
    READY = "READY"
    NOT_READY = "NOT_READY"
    PAUSED = "PAUSED"


class WorkQueueStatus(str, enum.Enum):
    READY = "READY"
    NOT_READY = "NOT_READY"
    PAUSED = "PAUSED"


class WorkerStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


deployment_status_enum = PGEnum(DeploymentStatus, name="deployment_status", create_type=False)
state_type_enum = PGEnum(StateType, name="state_type", create_type=False)
work_pool_status_enum = PGEnum(WorkPoolStatus, name="work_pool_status", create_type=False)
work_queue_status_enum = PGEnum(WorkQueueStatus, name="work_queue_status", create_type=False)
worker_status_enum = PGEnum(WorkerStatus, name="worker_status", create_type=False)


class Agent(Base):
    __tablename__ = "agent"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    last_activity_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    work_queue_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("work_queue.id"), nullable=False
    )

    work_queue: Mapped["WorkQueue"] = relationship(back_populates="agents")


class AlembicVersion(Base):
    __tablename__ = "alembic_version"

    version_num: Mapped[str] = mapped_column(String(32), primary_key=True)


class Artifact(Base):
    __tablename__ = "artifact"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    key: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    metadata_: Mapped[Optional[Any]] = mapped_column("metadata_", JSON, nullable=True)
    task_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    flow_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    description: Mapped[Optional[str]] = mapped_column(String)

    flow_run_states: Mapped[list["FlowRunState"]] = relationship(
        back_populates="result_artifact"
    )
    task_run_states: Mapped[list["TaskRunState"]] = relationship(
        back_populates="result_artifact"
    )


class ArtifactCollection(Base):
    __tablename__ = "artifact_collection"
    __table_args__ = (UniqueConstraint("key", name="uq_artifact_collection__key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    latest_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    task_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    flow_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    type: Mapped[Optional[str]] = mapped_column(String)
    data: Mapped[Optional[Any]] = mapped_column(JSON)
    description: Mapped[Optional[str]] = mapped_column(String)
    metadata_: Mapped[Optional[Any]] = mapped_column("metadata_", JSON)


class Automation(Base):
    __tablename__ = "automation"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    trigger: Mapped[Any] = mapped_column(JSONB, nullable=False)
    actions: Mapped[Any] = mapped_column(JSONB, nullable=False)
    actions_on_trigger: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    actions_on_resolve: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )

    buckets: Mapped[list["AutomationBucket"]] = relationship(
        back_populates="automation", cascade="all, delete-orphan"
    )
    related_resources: Mapped[list["AutomationRelatedResource"]] = relationship(
        back_populates="automation", cascade="all, delete-orphan"
    )
    composite_child_firings: Mapped[list["CompositeTriggerChildFiring"]] = relationship(
        back_populates="automation", cascade="all, delete-orphan"
    )


class AutomationBucket(Base):
    __tablename__ = "automation_bucket"
    __table_args__ = (
        UniqueConstraint(
            "automation_id",
            "trigger_id",
            "bucketing_key",
            name="uq_automation_bucket__automation_id__trigger_id__bucketing_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    automation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("automation.id", ondelete="CASCADE"), nullable=False
    )
    trigger_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    bucketing_key: Mapped[Any] = mapped_column(JSONB, nullable=False)
    last_event: Mapped[Optional[Any]] = mapped_column(JSONB)
    start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end: Mapped[datetime] = mapped_column("end", DateTime(timezone=True), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    last_operation: Mapped[Optional[str]] = mapped_column(String)
    triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    automation: Mapped["Automation"] = relationship(back_populates="buckets")


class AutomationEventFollower(Base):
    __tablename__ = "automation_event_follower"
    __table_args__ = (
        UniqueConstraint("scope", "follower_event_id", name="uq_follower_for_scope"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    leader_event_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    follower_event_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    received: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    follower: Mapped[Any] = mapped_column(JSONB, nullable=False)
    scope: Mapped[str] = mapped_column(String, nullable=False)


class AutomationRelatedResource(Base):
    __tablename__ = "automation_related_resource"
    __table_args__ = (
        UniqueConstraint(
            "automation_id",
            "resource_id",
            name="uq_automation_related_resource__automation_id__resource_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    automation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("automation.id", ondelete="CASCADE"), nullable=False
    )
    resource_id: Mapped[Optional[str]] = mapped_column(String)
    automation_owned_by_resource: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    automation: Mapped["Automation"] = relationship(back_populates="related_resources")


class BlockDocument(Base):
    __tablename__ = "block_document"
    __table_args__ = (
        UniqueConstraint("block_type_id", "name", name="uq_block__type_id_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    data: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    block_schema_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_schema.id", ondelete="CASCADE"), nullable=False
    )
    block_type_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_type.id", ondelete="CASCADE"), nullable=False
    )
    is_anonymous: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    block_type_name: Mapped[Optional[str]] = mapped_column(String)

    block_schema: Mapped["BlockSchema"] = relationship(back_populates="block_documents")
    block_type: Mapped["BlockType"] = relationship(back_populates="block_documents")
    parent_references: Mapped[list["BlockDocumentReference"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys="BlockDocumentReference.parent_block_document_id",
    )
    referenced_by: Mapped[list["BlockDocumentReference"]] = relationship(
        back_populates="reference",
        cascade="all, delete-orphan",
        foreign_keys="BlockDocumentReference.reference_block_document_id",
    )
    deployments_as_infrastructure: Mapped[list["Deployment"]] = relationship(
        back_populates="infrastructure_document",
        foreign_keys="Deployment.infrastructure_document_id",
    )
    deployments_as_storage: Mapped[list["Deployment"]] = relationship(
        back_populates="storage_document",
        foreign_keys="Deployment.storage_document_id",
    )
    flow_runs: Mapped[list["FlowRun"]] = relationship(
        back_populates="infrastructure_document",
        foreign_keys="FlowRun.infrastructure_document_id",
    )


class BlockDocumentReference(Base):
    __tablename__ = "block_document_reference"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_block_document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_document.id", ondelete="CASCADE"), nullable=False
    )
    reference_block_document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_document.id", ondelete="CASCADE"), nullable=False
    )

    parent: Mapped["BlockDocument"] = relationship(
        back_populates="parent_references",
        foreign_keys=[parent_block_document_id],
    )
    reference: Mapped["BlockDocument"] = relationship(
        back_populates="referenced_by",
        foreign_keys=[reference_block_document_id],
    )


class BlockSchema(Base):
    __tablename__ = "block_schema"
    __table_args__ = (
        UniqueConstraint("checksum", "version", name="uq_block_schema__checksum_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    fields: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    checksum: Mapped[str] = mapped_column(String, nullable=False)
    block_type_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_type.id", ondelete="CASCADE"), nullable=False
    )
    capabilities: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    version: Mapped[str] = mapped_column(
        String, nullable=False, server_default=text("'non-versioned'::character varying")
    )

    block_type: Mapped["BlockType"] = relationship(back_populates="block_schemas")
    block_documents: Mapped[list["BlockDocument"]] = relationship(
        back_populates="block_schema", cascade="all, delete-orphan"
    )
    parent_references: Mapped[list["BlockSchemaReference"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys="BlockSchemaReference.parent_block_schema_id",
    )
    referenced_by: Mapped[list["BlockSchemaReference"]] = relationship(
        back_populates="reference",
        cascade="all, delete-orphan",
        foreign_keys="BlockSchemaReference.reference_block_schema_id",
    )


class BlockSchemaReference(Base):
    __tablename__ = "block_schema_reference"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_block_schema_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_schema.id", ondelete="CASCADE"), nullable=False
    )
    reference_block_schema_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("block_schema.id", ondelete="CASCADE"), nullable=False
    )

    parent: Mapped["BlockSchema"] = relationship(
        back_populates="parent_references",
        foreign_keys=[parent_block_schema_id],
    )
    reference: Mapped["BlockSchema"] = relationship(
        back_populates="referenced_by",
        foreign_keys=[reference_block_schema_id],
    )


class BlockType(Base):
    __tablename__ = "block_type"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String)
    documentation_url: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String)
    code_example: Mapped[Optional[str]] = mapped_column(String)
    is_protected: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)

    block_schemas: Mapped[list["BlockSchema"]] = relationship(
        back_populates="block_type", cascade="all, delete-orphan"
    )
    block_documents: Mapped[list["BlockDocument"]] = relationship(
        back_populates="block_type", cascade="all, delete-orphan"
    )


class CompositeTriggerChildFiring(Base):
    __tablename__ = "composite_trigger_child_firing"
    __table_args__ = (
        UniqueConstraint(
            "automation_id",
            "parent_trigger_id",
            "child_trigger_id",
            name="uq_composite_trigger_child_firing__a_id__pt_id__ct__id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    automation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("automation.id", ondelete="CASCADE"), nullable=False
    )
    parent_trigger_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    child_trigger_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    child_firing_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    child_fired_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    child_firing: Mapped[Any] = mapped_column(JSONB, nullable=False)

    automation: Mapped["Automation"] = relationship(back_populates="composite_child_firings")


class ConcurrencyLimit(Base):
    __tablename__ = "concurrency_limit"
    __table_args__ = (UniqueConstraint("tag", name="uq_concurrency_limit__tag"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    tag: Mapped[str] = mapped_column(String, nullable=False)
    concurrency_limit: Mapped[int] = mapped_column(Integer, nullable=False)
    active_slots: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )


class ConcurrencyLimitV2(Base):
    __tablename__ = "concurrency_limit_v2"
    __table_args__ = (UniqueConstraint("name", name="uq_concurrency_limit_v2__name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    limit: Mapped[int] = mapped_column("limit", Integer, nullable=False)
    active_slots: Mapped[int] = mapped_column(Integer, nullable=False)
    denied_slots: Mapped[int] = mapped_column(Integer, nullable=False)
    slot_decay_per_second: Mapped[float] = mapped_column(Float, nullable=False)
    avg_slot_occupancy_seconds: Mapped[float] = mapped_column(Float, nullable=False)

    deployments: Mapped[list["Deployment"]] = relationship(
        back_populates="concurrency_limit_record"
    )


class Configuration(Base):
    __tablename__ = "configuration"
    __table_args__ = (UniqueConstraint("key", name="uq_configuration__key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[Any] = mapped_column(JSONB, nullable=False)


class CSRFToken(Base):
    __tablename__ = "csrf_token"
    __table_args__ = (UniqueConstraint("client", name="uq_csrf_token__client"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    token: Mapped[str] = mapped_column(String, nullable=False)
    client: Mapped[str] = mapped_column(String, nullable=False)
    expiration: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Deployment(Base):
    __tablename__ = "deployment"
    __table_args__ = (
        UniqueConstraint("flow_id", "name", name="uq_deployment__flow_id_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    parameters: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    flow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flow.id", ondelete="CASCADE"), nullable=False
    )
    infrastructure_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("block_document.id", ondelete="CASCADE")
    )
    description: Mapped[Optional[str]] = mapped_column(Text)
    parameter_openapi_schema: Mapped[Optional[Any]] = mapped_column(JSONB)
    storage_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("block_document.id", ondelete="CASCADE")
    )
    version: Mapped[Optional[str]] = mapped_column(String)
    infra_overrides: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    path: Mapped[Optional[str]] = mapped_column(String)
    entrypoint: Mapped[Optional[str]] = mapped_column(String)
    work_queue_name: Mapped[Optional[str]] = mapped_column(String)
    created_by: Mapped[Optional[Any]] = mapped_column(JSONB)
    updated_by: Mapped[Optional[Any]] = mapped_column(JSONB)
    work_queue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("work_queue.id", ondelete="SET NULL")
    )
    pull_steps: Mapped[Optional[Any]] = mapped_column(JSONB)
    enforce_parameter_schema: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    last_polled: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    paused: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    status: Mapped[DeploymentStatus] = mapped_column(
        deployment_status_enum, nullable=False, server_default=text("'NOT_READY'")
    )
    concurrency_limit: Mapped[Optional[int]] = mapped_column(Integer)
    concurrency_options: Mapped[Optional[Any]] = mapped_column(JSONB)
    concurrency_limit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("concurrency_limit_v2.id", ondelete="SET NULL")
    )
    labels: Mapped[Optional[Any]] = mapped_column(JSONB)
    version_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))

    flow: Mapped["Flow"] = relationship(back_populates="deployments")
    infrastructure_document: Mapped[Optional["BlockDocument"]] = relationship(
        back_populates="deployments_as_infrastructure",
        foreign_keys=[infrastructure_document_id],
    )
    storage_document: Mapped[Optional["BlockDocument"]] = relationship(
        back_populates="deployments_as_storage",
        foreign_keys=[storage_document_id],
    )
    work_queue: Mapped[Optional["WorkQueue"]] = relationship(back_populates="deployments")
    concurrency_limit_record: Mapped[Optional["ConcurrencyLimitV2"]] = relationship(
        back_populates="deployments", foreign_keys=[concurrency_limit_id]
    )
    schedules: Mapped[list["DeploymentSchedule"]] = relationship(
        back_populates="deployment", cascade="all, delete-orphan"
    )
    versions: Mapped[list["DeploymentVersion"]] = relationship(
        back_populates="deployment", cascade="all, delete-orphan"
    )


class DeploymentSchedule(Base):
    __tablename__ = "deployment_schedule"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    schedule: Mapped[Any] = mapped_column(JSONB, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    deployment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("deployment.id", ondelete="CASCADE"), nullable=False
    )
    max_scheduled_runs: Mapped[Optional[int]] = mapped_column(Integer)
    parameters: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    slug: Mapped[Optional[str]] = mapped_column(String)

    deployment: Mapped["Deployment"] = relationship(back_populates="schedules")


class DeploymentVersion(Base):
    __tablename__ = "deployment_version"
    __table_args__ = (
        UniqueConstraint(
            "deployment_id",
            "branch",
            name="uq_deployment_version__deployment__branch",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    deployment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("deployment.id", ondelete="CASCADE"), nullable=False
    )
    branch: Mapped[Optional[str]] = mapped_column(String)
    version_info: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    description: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    labels: Mapped[Optional[Any]] = mapped_column(JSONB)
    entrypoint: Mapped[Optional[str]] = mapped_column(String)
    pull_steps: Mapped[Optional[Any]] = mapped_column(JSONB)
    parameters: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    parameter_openapi_schema: Mapped[Optional[Any]] = mapped_column(JSONB)
    enforce_parameter_schema: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    work_queue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("work_queue.id", ondelete="SET NULL")
    )
    work_queue_name: Mapped[Optional[str]] = mapped_column(String)
    infra_overrides: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    deployment: Mapped["Deployment"] = relationship(back_populates="versions")
    work_queue: Mapped[Optional["WorkQueue"]] = relationship(
        back_populates="deployment_versions"
    )


class EventResources(Base):
    __tablename__ = "event_resources"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    occurred: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resource_id: Mapped[str] = mapped_column(Text, nullable=False)
    resource_role: Mapped[str] = mapped_column(Text, nullable=False)
    resource: Mapped[Any] = mapped_column(JSON, nullable=False)
    event_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)


class Events(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    occurred: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event: Mapped[str] = mapped_column(Text, nullable=False)
    resource_id: Mapped[str] = mapped_column(Text, nullable=False)
    resource: Mapped[Any] = mapped_column(JSONB, nullable=False)
    related_resource_ids: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    related: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    payload: Mapped[Any] = mapped_column(JSONB, nullable=False)
    received: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    follows: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))


class Flow(Base):
    __tablename__ = "flow"
    __table_args__ = (UniqueConstraint("name", name="uq_flow__name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    labels: Mapped[Optional[Any]] = mapped_column(JSONB)

    deployments: Mapped[list["Deployment"]] = relationship(
        back_populates="flow", cascade="all, delete-orphan"
    )
    flow_runs: Mapped[list["FlowRun"]] = relationship(
        back_populates="flow", cascade="all, delete-orphan"
    )


class FlowRun(Base):
    __tablename__ = "flow_run"
    __table_args__ = (
        UniqueConstraint(
            "flow_id",
            "idempotency_key",
            name="uq_flow_run__flow_id_idempotency_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    state_type: Mapped[Optional[StateType]] = mapped_column(state_type_enum)
    run_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    expected_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    next_scheduled_start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total_run_time: Mapped[timedelta] = mapped_column(
        Interval, nullable=False, server_default=text("'00:00:00'::interval")
    )
    flow_version: Mapped[Optional[str]] = mapped_column(String)
    parameters: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(String)
    context: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    empirical_policy: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    auto_scheduled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    flow_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flow.id", ondelete="CASCADE"), nullable=False
    )
    deployment_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    parent_task_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("task_run.id", ondelete="SET NULL")
    )
    state_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("flow_run_state.id", ondelete="SET NULL")
    )
    state_name: Mapped[Optional[str]] = mapped_column(String)
    infrastructure_document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("block_document.id", ondelete="CASCADE")
    )
    work_queue_name: Mapped[Optional[str]] = mapped_column(String)
    state_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[Any]] = mapped_column(JSONB)
    infrastructure_pid: Mapped[Optional[str]] = mapped_column(String)
    work_queue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("work_queue.id", ondelete="SET NULL")
    )
    job_variables: Mapped[Optional[Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    deployment_version: Mapped[Optional[str]] = mapped_column(String)
    labels: Mapped[Optional[Any]] = mapped_column(JSONB)

    flow: Mapped["Flow"] = relationship(back_populates="flow_runs")
    parent_task_run: Mapped[Optional["TaskRun"]] = relationship(
        back_populates="child_flow_runs", foreign_keys=[parent_task_run_id]
    )
    state: Mapped[Optional["FlowRunState"]] = relationship(
        back_populates="current_flow_run",
        foreign_keys=[state_id],
        post_update=True,
        uselist=False,
    )
    states: Mapped[list["FlowRunState"]] = relationship(
        back_populates="flow_run",
        foreign_keys="FlowRunState.flow_run_id",
        cascade="all, delete-orphan",
    )
    flow_run_inputs: Mapped[list["FlowRunInput"]] = relationship(
        back_populates="flow_run", cascade="all, delete-orphan"
    )
    task_runs: Mapped[list["TaskRun"]] = relationship(
        back_populates="flow_run",
        foreign_keys="TaskRun.flow_run_id",
        cascade="all, delete-orphan",
    )
    infrastructure_document: Mapped[Optional["BlockDocument"]] = relationship(
        back_populates="flow_runs",
        foreign_keys=[infrastructure_document_id],
    )
    work_queue: Mapped[Optional["WorkQueue"]] = relationship(back_populates="flow_runs")


class FlowRunInput(Base):
    __tablename__ = "flow_run_input"
    __table_args__ = (
        UniqueConstraint(
            "flow_run_id",
            "key",
            name="uq_flow_run_input__flow_run_id_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    flow_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flow_run.id", ondelete="CASCADE"), nullable=False
    )
    sender: Mapped[Optional[str]] = mapped_column(String)

    flow_run: Mapped["FlowRun"] = relationship(back_populates="flow_run_inputs")


class FlowRunState(Base):
    __tablename__ = "flow_run_state"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    type: Mapped[StateType] = mapped_column(state_type_enum, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        "timestamp",
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(String)
    state_details: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    data: Mapped[Optional[Any]] = mapped_column(JSONB)
    flow_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("flow_run.id", ondelete="CASCADE"), nullable=False
    )
    result_artifact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("artifact.id", ondelete="SET NULL")
    )

    flow_run: Mapped["FlowRun"] = relationship(
        back_populates="states", foreign_keys=[flow_run_id]
    )
    current_flow_run: Mapped[Optional["FlowRun"]] = relationship(
        back_populates="state",
        foreign_keys="FlowRun.state_id",
        uselist=False,
    )
    result_artifact: Mapped[Optional["Artifact"]] = relationship(
        back_populates="flow_run_states"
    )


class Log(Base):
    __tablename__ = "log"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    flow_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    task_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        "timestamp", DateTime(timezone=True), nullable=False
    )


class SavedSearch(Base):
    __tablename__ = "saved_search"
    __table_args__ = (UniqueConstraint("name", name="uq_saved_search__name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    filters: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )


class TaskRun(Base):
    __tablename__ = "task_run"
    __table_args__ = (
        UniqueConstraint(
            "flow_run_id",
            "task_key",
            "dynamic_key",
            name="uq_task_run__flow_run_id_task_key_dynamic_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    state_type: Mapped[Optional[StateType]] = mapped_column(state_type_enum)
    run_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    expected_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    next_scheduled_start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    total_run_time: Mapped[timedelta] = mapped_column(
        Interval, nullable=False, server_default=text("'00:00:00'::interval")
    )
    task_key: Mapped[str] = mapped_column(String, nullable=False)
    dynamic_key: Mapped[str] = mapped_column(String, nullable=False)
    cache_key: Mapped[Optional[str]] = mapped_column(String)
    cache_expiration: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    task_version: Mapped[Optional[str]] = mapped_column(String)
    empirical_policy: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    task_inputs: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    flow_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("flow_run.id", ondelete="CASCADE")
    )
    state_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    state_name: Mapped[Optional[str]] = mapped_column(String)
    state_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    flow_run_run_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    labels: Mapped[Optional[Any]] = mapped_column(JSONB)

    flow_run: Mapped[Optional["FlowRun"]] = relationship(
        back_populates="task_runs", foreign_keys=[flow_run_id]
    )
    child_flow_runs: Mapped[list["FlowRun"]] = relationship(
        back_populates="parent_task_run",
        foreign_keys="FlowRun.parent_task_run_id",
    )
    states: Mapped[list["TaskRunState"]] = relationship(
        back_populates="task_run",
        foreign_keys="TaskRunState.task_run_id",
        cascade="all, delete-orphan",
    )


class TaskRunState(Base):
    __tablename__ = "task_run_state"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    type: Mapped[StateType] = mapped_column(state_type_enum, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        "timestamp",
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(String)
    state_details: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    data: Mapped[Optional[Any]] = mapped_column(JSONB)
    task_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("task_run.id", ondelete="CASCADE"), nullable=False
    )
    result_artifact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("artifact.id", ondelete="SET NULL")
    )

    task_run: Mapped["TaskRun"] = relationship(
        back_populates="states", foreign_keys=[task_run_id]
    )
    result_artifact: Mapped[Optional["Artifact"]] = relationship(
        back_populates="task_run_states"
    )


class TaskRunStateCache(Base):
    __tablename__ = "task_run_state_cache"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    cache_key: Mapped[str] = mapped_column(String, nullable=False)
    cache_expiration: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    task_run_state_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)


class Variable(Base):
    __tablename__ = "variable"
    __table_args__ = (UniqueConstraint("name", name="uq_variable__name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    tags: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    value: Mapped[Optional[Any]] = mapped_column(JSONB)


class WorkPool(Base):
    __tablename__ = "work_pool"
    __table_args__ = (UniqueConstraint("name", name="uq_work_pool__name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, nullable=False)
    base_job_template: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    is_paused: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    concurrency_limit: Mapped[Optional[int]] = mapped_column(Integer)
    default_queue_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("work_queue.id", ondelete="RESTRICT")
    )
    status: Mapped[WorkPoolStatus] = mapped_column(
        work_pool_status_enum, nullable=False, server_default=text("'NOT_READY'")
    )
    last_transitioned_status_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    last_status_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(PGUUID(as_uuid=True))
    storage_configuration: Mapped[Any] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    work_queues: Mapped[list["WorkQueue"]] = relationship(
        back_populates="work_pool", cascade="all, delete-orphan"
    )
    workers: Mapped[list["Worker"]] = relationship(
        back_populates="work_pool", cascade="all, delete-orphan"
    )
    default_queue: Mapped[Optional["WorkQueue"]] = relationship(
        back_populates="default_for_pools",
        foreign_keys=[default_queue_id],
        post_update=True,
    )


class WorkQueue(Base):
    __tablename__ = "work_queue"
    __table_args__ = (
        UniqueConstraint(
            "work_pool_id",
            "name",
            name="uq_work_queue__work_pool_id_name",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    filter: Mapped[Optional[Any]] = mapped_column(JSONB)
    description: Mapped[str] = mapped_column(
        String, nullable=False, server_default=text("''::character varying")
    )
    is_paused: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    concurrency_limit: Mapped[Optional[int]] = mapped_column(Integer)
    last_polled: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    work_pool_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("work_pool.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[WorkQueueStatus] = mapped_column(
        work_queue_status_enum, nullable=False, server_default=text("'NOT_READY'")
    )

    work_pool: Mapped["WorkPool"] = relationship(back_populates="work_queues")
    default_for_pools: Mapped[list["WorkPool"]] = relationship(
        back_populates="default_queue", foreign_keys=[WorkPool.default_queue_id]
    )
    agents: Mapped[list["Agent"]] = relationship(back_populates="work_queue")
    deployments: Mapped[list["Deployment"]] = relationship(back_populates="work_queue")
    deployment_versions: Mapped[list["DeploymentVersion"]] = relationship(
        back_populates="work_queue"
    )
    flow_runs: Mapped[list["FlowRun"]] = relationship(back_populates="work_queue")


class Worker(Base):
    __tablename__ = "worker"
    __table_args__ = (
        UniqueConstraint(
            "work_pool_id",
            "name",
            name="uq_worker__work_pool_id_name",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    last_heartbeat_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    work_pool_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("work_pool.id", ondelete="CASCADE"), nullable=False
    )
    heartbeat_interval_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[WorkerStatus] = mapped_column(
        worker_status_enum, nullable=False, server_default=text("'OFFLINE'")
    )

    work_pool: Mapped["WorkPool"] = relationship(back_populates="workers")
