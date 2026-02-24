from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from prefect_models import (
    DeploymentStatus,
    StateType,
    WorkPoolStatus,
    WorkQueueStatus,
    WorkerStatus,
)

orm_config = ConfigDict(from_attributes=True)


class AgentCreate(BaseModel):
    name: str
    work_queue_id: UUID
    last_activity_time: datetime | None = None


class AgentRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    last_activity_time: datetime
    work_queue_id: UUID


class AgentList(AgentRead):
    pass


class AlembicVersionCreate(BaseModel):
    version_num: str


class AlembicVersionRead(BaseModel):
    model_config = orm_config

    version_num: str


class AlembicVersionList(AlembicVersionRead):
    pass


class ArtifactCreate(BaseModel):
    key: str | None = None
    type: str | None = None
    data: Any | None = None
    metadata_: Any | None = None
    task_run_id: UUID | None = None
    flow_run_id: UUID | None = None
    description: str | None = None


class ArtifactRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    key: str | None
    type: str | None
    data: Any | None
    metadata_: Any | None
    task_run_id: UUID | None
    flow_run_id: UUID | None
    description: str | None


class ArtifactList(ArtifactRead):
    pass


class ArtifactCollectionCreate(BaseModel):
    key: str
    latest_id: UUID
    task_run_id: UUID | None = None
    flow_run_id: UUID | None = None
    type: str | None = None
    data: Any | None = None
    description: str | None = None
    metadata_: Any | None = None


class ArtifactCollectionRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    key: str
    latest_id: UUID
    task_run_id: UUID | None
    flow_run_id: UUID | None
    type: str | None
    data: Any | None
    description: str | None
    metadata_: Any | None


class ArtifactCollectionList(ArtifactCollectionRead):
    pass


class AutomationCreate(BaseModel):
    name: str
    description: str
    enabled: bool | None = None
    trigger: Any
    actions: Any
    actions_on_trigger: Any | None = None
    actions_on_resolve: Any | None = None
    tags: Any | None = None


class AutomationRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    description: str
    enabled: bool
    trigger: Any
    actions: Any
    actions_on_trigger: Any
    actions_on_resolve: Any
    tags: Any


class AutomationList(AutomationRead):
    pass


class AutomationBucketCreate(BaseModel):
    automation_id: UUID
    trigger_id: UUID
    bucketing_key: Any
    last_event: Any | None = None
    start: datetime
    end: datetime
    count: int
    last_operation: str | None = None
    triggered_at: datetime | None = None


class AutomationBucketRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    automation_id: UUID
    trigger_id: UUID
    bucketing_key: Any
    last_event: Any | None
    start: datetime
    end: datetime
    count: int
    last_operation: str | None
    triggered_at: datetime | None


class AutomationBucketList(AutomationBucketRead):
    pass


class AutomationEventFollowerCreate(BaseModel):
    leader_event_id: UUID
    follower_event_id: UUID
    received: datetime
    follower: Any
    scope: str


class AutomationEventFollowerRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    leader_event_id: UUID
    follower_event_id: UUID
    received: datetime
    follower: Any
    scope: str


class AutomationEventFollowerList(AutomationEventFollowerRead):
    pass


class AutomationRelatedResourceCreate(BaseModel):
    automation_id: UUID
    resource_id: str | None = None
    automation_owned_by_resource: bool | None = None


class AutomationRelatedResourceRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    automation_id: UUID
    resource_id: str | None
    automation_owned_by_resource: bool


class AutomationRelatedResourceList(AutomationRelatedResourceRead):
    pass


class BlockDocumentCreate(BaseModel):
    name: str
    data: Any | None = None
    block_schema_id: UUID
    block_type_id: UUID
    is_anonymous: bool | None = None
    block_type_name: str | None = None


class BlockDocumentRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    data: Any
    block_schema_id: UUID
    block_type_id: UUID
    is_anonymous: bool
    block_type_name: str | None


class BlockDocumentList(BlockDocumentRead):
    pass


class BlockDocumentReferenceCreate(BaseModel):
    name: str
    parent_block_document_id: UUID
    reference_block_document_id: UUID


class BlockDocumentReferenceRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    parent_block_document_id: UUID
    reference_block_document_id: UUID


class BlockDocumentReferenceList(BlockDocumentReferenceRead):
    pass


class BlockSchemaCreate(BaseModel):
    checksum: str
    block_type_id: UUID
    fields: Any | None = None
    capabilities: Any | None = None
    version: str | None = None


class BlockSchemaRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    fields: Any
    checksum: str
    block_type_id: UUID
    capabilities: Any
    version: str


class BlockSchemaList(BlockSchemaRead):
    pass


class BlockSchemaReferenceCreate(BaseModel):
    name: str
    parent_block_schema_id: UUID
    reference_block_schema_id: UUID


class BlockSchemaReferenceRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    parent_block_schema_id: UUID
    reference_block_schema_id: UUID


class BlockSchemaReferenceList(BlockSchemaReferenceRead):
    pass


class BlockTypeCreate(BaseModel):
    name: str
    logo_url: str | None = None
    documentation_url: str | None = None
    description: str | None = None
    code_example: str | None = None
    is_protected: bool | None = None
    slug: str


class BlockTypeRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    logo_url: str | None
    documentation_url: str | None
    description: str | None
    code_example: str | None
    is_protected: bool
    slug: str


class BlockTypeList(BlockTypeRead):
    pass


class CompositeTriggerChildFiringCreate(BaseModel):
    automation_id: UUID
    parent_trigger_id: UUID
    child_trigger_id: UUID
    child_firing_id: UUID
    child_fired_at: datetime | None = None
    child_firing: Any


class CompositeTriggerChildFiringRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    automation_id: UUID
    parent_trigger_id: UUID
    child_trigger_id: UUID
    child_firing_id: UUID
    child_fired_at: datetime | None
    child_firing: Any


class CompositeTriggerChildFiringList(CompositeTriggerChildFiringRead):
    pass


class ConcurrencyLimitCreate(BaseModel):
    tag: str
    concurrency_limit: int
    active_slots: Any | None = None


class ConcurrencyLimitRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    tag: str
    concurrency_limit: int
    active_slots: Any


class ConcurrencyLimitList(ConcurrencyLimitRead):
    pass


class ConcurrencyLimitV2Create(BaseModel):
    active: bool
    name: str
    limit: int
    active_slots: int
    denied_slots: int
    slot_decay_per_second: float
    avg_slot_occupancy_seconds: float


class ConcurrencyLimitV2Read(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    active: bool
    name: str
    limit: int
    active_slots: int
    denied_slots: int
    slot_decay_per_second: float
    avg_slot_occupancy_seconds: float


class ConcurrencyLimitV2List(ConcurrencyLimitV2Read):
    pass


class ConfigurationCreate(BaseModel):
    key: str
    value: Any


class ConfigurationRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    key: str
    value: Any


class ConfigurationList(ConfigurationRead):
    pass


class CSRFTokenCreate(BaseModel):
    token: str
    client: str
    expiration: datetime


class CSRFTokenRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    token: str
    client: str
    expiration: datetime


class CSRFTokenList(CSRFTokenRead):
    pass


class DeploymentCreate(BaseModel):
    name: str
    flow_id: UUID
    tags: Any | None = None
    parameters: Any | None = None
    infrastructure_document_id: UUID | None = None
    description: str | None = None
    parameter_openapi_schema: Any | None = None
    storage_document_id: UUID | None = None
    version: str | None = None
    infra_overrides: Any | None = None
    path: str | None = None
    entrypoint: str | None = None
    work_queue_name: str | None = None
    created_by: Any | None = None
    updated_by: Any | None = None
    work_queue_id: UUID | None = None
    pull_steps: Any | None = None
    enforce_parameter_schema: bool | None = None
    last_polled: datetime | None = None
    paused: bool | None = None
    status: DeploymentStatus | None = None
    concurrency_limit: int | None = None
    concurrency_options: Any | None = None
    concurrency_limit_id: UUID | None = None
    labels: Any | None = None
    version_id: UUID | None = None


class DeploymentRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    tags: Any
    parameters: Any
    flow_id: UUID
    infrastructure_document_id: UUID | None
    description: str | None
    parameter_openapi_schema: Any | None
    storage_document_id: UUID | None
    version: str | None
    infra_overrides: Any
    path: str | None
    entrypoint: str | None
    work_queue_name: str | None
    created_by: Any | None
    updated_by: Any | None
    work_queue_id: UUID | None
    pull_steps: Any | None
    enforce_parameter_schema: bool
    last_polled: datetime | None
    paused: bool
    status: DeploymentStatus
    concurrency_limit: int | None
    concurrency_options: Any | None
    concurrency_limit_id: UUID | None
    labels: Any | None
    version_id: UUID | None


class DeploymentList(DeploymentRead):
    pass


class DeploymentScheduleCreate(BaseModel):
    schedule: Any
    active: bool
    deployment_id: UUID
    max_scheduled_runs: int | None = None
    parameters: Any | None = None
    slug: str | None = None


class DeploymentScheduleRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    schedule: Any
    active: bool
    deployment_id: UUID
    max_scheduled_runs: int | None
    parameters: Any
    slug: str | None


class DeploymentScheduleList(DeploymentScheduleRead):
    pass


class DeploymentVersionCreate(BaseModel):
    deployment_id: UUID
    branch: str | None = None
    version_info: Any | None = None
    description: str | None = None
    tags: Any | None = None
    labels: Any | None = None
    entrypoint: str | None = None
    pull_steps: Any | None = None
    parameters: Any | None = None
    parameter_openapi_schema: Any | None = None
    enforce_parameter_schema: bool | None = None
    work_queue_id: UUID | None = None
    work_queue_name: str | None = None
    infra_overrides: Any | None = None


class DeploymentVersionRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    deployment_id: UUID
    branch: str | None
    version_info: Any
    description: str | None
    tags: Any
    labels: Any | None
    entrypoint: str | None
    pull_steps: Any | None
    parameters: Any
    parameter_openapi_schema: Any | None
    enforce_parameter_schema: bool
    work_queue_id: UUID | None
    work_queue_name: str | None
    infra_overrides: Any


class DeploymentVersionList(DeploymentVersionRead):
    pass


class EventResourcesCreate(BaseModel):
    occurred: datetime
    resource_id: str
    resource_role: str
    resource: Any
    event_id: UUID


class EventResourcesRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    occurred: datetime
    resource_id: str
    resource_role: str
    resource: Any
    event_id: UUID


class EventResourcesList(EventResourcesRead):
    pass


class EventsCreate(BaseModel):
    occurred: datetime
    event: str
    resource_id: str
    resource: Any
    related_resource_ids: Any | None = None
    related: Any | None = None
    payload: Any
    received: datetime
    recorded: datetime
    follows: UUID | None = None


class EventsRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    occurred: datetime
    event: str
    resource_id: str
    resource: Any
    related_resource_ids: Any
    related: Any
    payload: Any
    received: datetime
    recorded: datetime
    follows: UUID | None


class EventsList(EventsRead):
    pass


class FlowCreate(BaseModel):
    name: str
    tags: Any | None = None
    labels: Any | None = None


class FlowRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    tags: Any
    labels: Any | None


class FlowList(FlowRead):
    pass


class FlowRunCreate(BaseModel):
    name: str
    flow_id: UUID
    state_type: StateType | None = None
    run_count: int | None = None
    expected_start_time: datetime | None = None
    next_scheduled_start_time: datetime | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    total_run_time: timedelta | None = None
    flow_version: str | None = None
    parameters: Any | None = None
    idempotency_key: str | None = None
    context: Any | None = None
    empirical_policy: Any | None = None
    tags: Any | None = None
    auto_scheduled: bool | None = None
    deployment_id: UUID | None = None
    parent_task_run_id: UUID | None = None
    state_id: UUID | None = None
    state_name: str | None = None
    infrastructure_document_id: UUID | None = None
    work_queue_name: str | None = None
    state_timestamp: datetime | None = None
    created_by: Any | None = None
    infrastructure_pid: str | None = None
    work_queue_id: UUID | None = None
    job_variables: Any | None = None
    deployment_version: str | None = None
    labels: Any | None = None


class FlowRunRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    state_type: StateType | None
    run_count: int
    expected_start_time: datetime | None
    next_scheduled_start_time: datetime | None
    start_time: datetime | None
    end_time: datetime | None
    total_run_time: timedelta
    flow_version: str | None
    parameters: Any
    idempotency_key: str | None
    context: Any
    empirical_policy: Any
    tags: Any
    auto_scheduled: bool
    flow_id: UUID
    deployment_id: UUID | None
    parent_task_run_id: UUID | None
    state_id: UUID | None
    state_name: str | None
    infrastructure_document_id: UUID | None
    work_queue_name: str | None
    state_timestamp: datetime | None
    created_by: Any | None
    infrastructure_pid: str | None
    work_queue_id: UUID | None
    job_variables: Any | None
    deployment_version: str | None
    labels: Any | None


class FlowRunList(FlowRunRead):
    pass


class FlowRunInputCreate(BaseModel):
    key: str
    value: str
    flow_run_id: UUID
    sender: str | None = None


class FlowRunInputRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    key: str
    value: str
    flow_run_id: UUID
    sender: str | None


class FlowRunInputList(FlowRunInputRead):
    pass


class FlowRunStateCreate(BaseModel):
    type: StateType
    name: str
    flow_run_id: UUID
    timestamp: datetime | None = None
    message: str | None = None
    state_details: Any | None = None
    data: Any | None = None
    result_artifact_id: UUID | None = None


class FlowRunStateRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    type: StateType
    timestamp: datetime
    name: str
    message: str | None
    state_details: Any
    data: Any | None
    flow_run_id: UUID
    result_artifact_id: UUID | None


class FlowRunStateList(FlowRunStateRead):
    pass


class LogCreate(BaseModel):
    name: str
    level: int
    message: str
    timestamp: datetime
    flow_run_id: UUID | None = None
    task_run_id: UUID | None = None


class LogRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    level: int
    flow_run_id: UUID | None
    task_run_id: UUID | None
    message: str
    timestamp: datetime


class LogList(LogRead):
    pass


class SavedSearchCreate(BaseModel):
    name: str
    filters: Any | None = None


class SavedSearchRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    filters: Any


class SavedSearchList(SavedSearchRead):
    pass


class TaskRunCreate(BaseModel):
    name: str
    task_key: str
    dynamic_key: str
    state_type: StateType | None = None
    run_count: int | None = None
    expected_start_time: datetime | None = None
    next_scheduled_start_time: datetime | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    total_run_time: timedelta | None = None
    cache_key: str | None = None
    cache_expiration: datetime | None = None
    task_version: str | None = None
    empirical_policy: Any | None = None
    task_inputs: Any | None = None
    tags: Any | None = None
    flow_run_id: UUID | None = None
    state_id: UUID | None = None
    state_name: str | None = None
    state_timestamp: datetime | None = None
    flow_run_run_count: int | None = None
    labels: Any | None = None


class TaskRunRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    state_type: StateType | None
    run_count: int
    expected_start_time: datetime | None
    next_scheduled_start_time: datetime | None
    start_time: datetime | None
    end_time: datetime | None
    total_run_time: timedelta
    task_key: str
    dynamic_key: str
    cache_key: str | None
    cache_expiration: datetime | None
    task_version: str | None
    empirical_policy: Any
    task_inputs: Any
    tags: Any
    flow_run_id: UUID | None
    state_id: UUID | None
    state_name: str | None
    state_timestamp: datetime | None
    flow_run_run_count: int
    labels: Any | None


class TaskRunList(TaskRunRead):
    pass


class TaskRunStateCreate(BaseModel):
    type: StateType
    name: str
    task_run_id: UUID
    timestamp: datetime | None = None
    message: str | None = None
    state_details: Any | None = None
    data: Any | None = None
    result_artifact_id: UUID | None = None


class TaskRunStateRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    type: StateType
    timestamp: datetime
    name: str
    message: str | None
    state_details: Any
    data: Any | None
    task_run_id: UUID
    result_artifact_id: UUID | None


class TaskRunStateList(TaskRunStateRead):
    pass


class TaskRunStateCacheCreate(BaseModel):
    cache_key: str
    cache_expiration: datetime | None = None
    task_run_state_id: UUID


class TaskRunStateCacheRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    cache_key: str
    cache_expiration: datetime | None
    task_run_state_id: UUID


class TaskRunStateCacheList(TaskRunStateCacheRead):
    pass


class VariableCreate(BaseModel):
    name: str
    tags: Any | None = None
    value: Any | None = None


class VariableRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    tags: Any
    value: Any | None


class VariableList(VariableRead):
    pass


class WorkPoolCreate(BaseModel):
    name: str
    type: str
    description: str | None = None
    base_job_template: Any | None = None
    is_paused: bool | None = None
    concurrency_limit: int | None = None
    default_queue_id: UUID | None = None
    status: WorkPoolStatus | None = None
    last_transitioned_status_at: datetime | None = None
    last_status_event_id: UUID | None = None
    storage_configuration: Any | None = None


class WorkPoolRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    description: str | None
    type: str
    base_job_template: Any
    is_paused: bool
    concurrency_limit: int | None
    default_queue_id: UUID | None
    status: WorkPoolStatus
    last_transitioned_status_at: datetime | None
    last_status_event_id: UUID | None
    storage_configuration: Any


class WorkPoolList(WorkPoolRead):
    pass


class WorkQueueCreate(BaseModel):
    name: str
    work_pool_id: UUID
    filter: Any | None = None
    description: str | None = None
    is_paused: bool | None = None
    concurrency_limit: int | None = None
    last_polled: datetime | None = None
    priority: int | None = None
    status: WorkQueueStatus | None = None


class WorkQueueRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    filter: Any | None
    description: str
    is_paused: bool
    concurrency_limit: int | None
    last_polled: datetime | None
    priority: int
    work_pool_id: UUID
    status: WorkQueueStatus


class WorkQueueList(WorkQueueRead):
    pass


class WorkerCreate(BaseModel):
    name: str
    work_pool_id: UUID
    last_heartbeat_time: datetime | None = None
    heartbeat_interval_seconds: int | None = None
    status: WorkerStatus | None = None


class WorkerRead(BaseModel):
    model_config = orm_config

    id: UUID
    created: datetime
    updated: datetime
    name: str
    last_heartbeat_time: datetime
    work_pool_id: UUID
    heartbeat_interval_seconds: int | None
    status: WorkerStatus


class WorkerList(WorkerRead):
    pass
