--
-- PostgreSQL database dump
--

\restrict SdpbYSrywaXrJPMbVszNH4TL581X9S4ltzjZtEgiufmXBEKahvZyU5i4KRv4c6B

-- Dumped from database version 14.19 (Debian 14.19-1.pgdg13+1)
-- Dumped by pg_dump version 14.19 (Debian 14.19-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: deployment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deployment_status AS ENUM (
    'READY',
    'NOT_READY'
);


--
-- Name: state_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.state_type AS ENUM (
    'SCHEDULED',
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'CRASHED',
    'PAUSED',
    'CANCELLING'
);


--
-- Name: work_pool_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_pool_status AS ENUM (
    'READY',
    'NOT_READY',
    'PAUSED'
);


--
-- Name: work_queue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_queue_status AS ENUM (
    'READY',
    'NOT_READY',
    'PAUSED'
);


--
-- Name: worker_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.worker_status AS ENUM (
    'ONLINE',
    'OFFLINE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    last_activity_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    work_queue_id uuid NOT NULL
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: artifact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    key character varying,
    type character varying,
    data json,
    metadata_ json,
    task_run_id uuid,
    flow_run_id uuid,
    description character varying
);


--
-- Name: artifact_collection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact_collection (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    key character varying NOT NULL,
    latest_id uuid NOT NULL,
    task_run_id uuid,
    flow_run_id uuid,
    type character varying,
    data json,
    description character varying,
    metadata_ json
);


--
-- Name: automation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation (
    name character varying NOT NULL,
    description character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    trigger jsonb NOT NULL,
    actions jsonb NOT NULL,
    actions_on_trigger jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions_on_resolve jsonb DEFAULT '[]'::jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: automation_bucket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_bucket (
    automation_id uuid NOT NULL,
    trigger_id uuid NOT NULL,
    bucketing_key jsonb NOT NULL,
    last_event jsonb,
    start timestamp with time zone NOT NULL,
    "end" timestamp with time zone NOT NULL,
    count integer NOT NULL,
    last_operation character varying,
    triggered_at timestamp with time zone,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: automation_event_follower; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_event_follower (
    leader_event_id uuid NOT NULL,
    follower_event_id uuid NOT NULL,
    received timestamp with time zone NOT NULL,
    follower jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scope character varying NOT NULL
);


--
-- Name: automation_related_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_related_resource (
    automation_id uuid NOT NULL,
    resource_id character varying,
    automation_owned_by_resource boolean DEFAULT false NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: block_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_document (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    block_schema_id uuid NOT NULL,
    block_type_id uuid NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    block_type_name character varying
);


--
-- Name: block_document_reference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_document_reference (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    parent_block_document_id uuid NOT NULL,
    reference_block_document_id uuid NOT NULL
);


--
-- Name: block_schema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_schema (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    checksum character varying NOT NULL,
    block_type_id uuid NOT NULL,
    capabilities jsonb DEFAULT '[]'::jsonb NOT NULL,
    version character varying DEFAULT 'non-versioned'::character varying NOT NULL
);


--
-- Name: block_schema_reference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_schema_reference (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    parent_block_schema_id uuid NOT NULL,
    reference_block_schema_id uuid NOT NULL
);


--
-- Name: block_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    logo_url character varying,
    documentation_url character varying,
    description character varying,
    code_example character varying,
    is_protected boolean DEFAULT false NOT NULL,
    slug character varying NOT NULL
);


--
-- Name: composite_trigger_child_firing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.composite_trigger_child_firing (
    automation_id uuid NOT NULL,
    parent_trigger_id uuid NOT NULL,
    child_trigger_id uuid NOT NULL,
    child_firing_id uuid NOT NULL,
    child_fired_at timestamp with time zone,
    child_firing jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: concurrency_limit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concurrency_limit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tag character varying NOT NULL,
    concurrency_limit integer NOT NULL,
    active_slots jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: concurrency_limit_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.concurrency_limit_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    active boolean NOT NULL,
    name character varying NOT NULL,
    "limit" integer NOT NULL,
    active_slots integer NOT NULL,
    denied_slots integer NOT NULL,
    slot_decay_per_second double precision NOT NULL,
    avg_slot_occupancy_seconds double precision NOT NULL
);


--
-- Name: configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    key character varying NOT NULL,
    value jsonb NOT NULL
);


--
-- Name: csrf_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csrf_token (
    token character varying NOT NULL,
    client character varying NOT NULL,
    expiration timestamp with time zone NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: deployment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    flow_id uuid NOT NULL,
    infrastructure_document_id uuid,
    description text,
    parameter_openapi_schema jsonb,
    storage_document_id uuid,
    version character varying,
    infra_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    path character varying,
    entrypoint character varying,
    work_queue_name character varying,
    created_by jsonb,
    updated_by jsonb,
    work_queue_id uuid,
    pull_steps jsonb,
    enforce_parameter_schema boolean DEFAULT false NOT NULL,
    last_polled timestamp with time zone,
    paused boolean DEFAULT false NOT NULL,
    status public.deployment_status DEFAULT 'NOT_READY'::public.deployment_status NOT NULL,
    concurrency_limit integer,
    concurrency_options jsonb,
    concurrency_limit_id uuid,
    labels jsonb,
    version_id uuid
);


--
-- Name: deployment_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    schedule jsonb NOT NULL,
    active boolean NOT NULL,
    deployment_id uuid NOT NULL,
    max_scheduled_runs integer,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    slug character varying
);


--
-- Name: deployment_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deployment_version (
    deployment_id uuid NOT NULL,
    branch character varying,
    version_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    labels jsonb,
    entrypoint character varying,
    pull_steps jsonb,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    parameter_openapi_schema jsonb,
    enforce_parameter_schema boolean DEFAULT false NOT NULL,
    work_queue_id uuid,
    work_queue_name character varying,
    infra_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: event_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_resources (
    occurred timestamp with time zone NOT NULL,
    resource_id text NOT NULL,
    resource_role text NOT NULL,
    resource json NOT NULL,
    event_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    occurred timestamp with time zone NOT NULL,
    event text NOT NULL,
    resource_id text NOT NULL,
    resource jsonb NOT NULL,
    related_resource_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    related jsonb DEFAULT '[]'::jsonb NOT NULL,
    payload jsonb NOT NULL,
    received timestamp with time zone NOT NULL,
    recorded timestamp with time zone NOT NULL,
    follows uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: flow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flow (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    labels jsonb
);


--
-- Name: flow_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flow_run (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    state_type public.state_type,
    run_count integer DEFAULT 0 NOT NULL,
    expected_start_time timestamp with time zone,
    next_scheduled_start_time timestamp with time zone,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    total_run_time interval DEFAULT '00:00:00'::interval NOT NULL,
    flow_version character varying,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    idempotency_key character varying,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    empirical_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    auto_scheduled boolean DEFAULT false NOT NULL,
    flow_id uuid NOT NULL,
    deployment_id uuid,
    parent_task_run_id uuid,
    state_id uuid,
    state_name character varying,
    infrastructure_document_id uuid,
    work_queue_name character varying,
    state_timestamp timestamp with time zone,
    created_by jsonb,
    infrastructure_pid character varying,
    work_queue_id uuid,
    job_variables jsonb DEFAULT '{}'::jsonb,
    deployment_version character varying,
    labels jsonb
);


--
-- Name: flow_run_input; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flow_run_input (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    key character varying NOT NULL,
    value text NOT NULL,
    flow_run_id uuid NOT NULL,
    sender character varying
);


--
-- Name: flow_run_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flow_run_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public.state_type NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    message character varying,
    state_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    data jsonb,
    flow_run_id uuid NOT NULL,
    result_artifact_id uuid
);


--
-- Name: log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    level smallint NOT NULL,
    flow_run_id uuid,
    task_run_id uuid,
    message text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL
);


--
-- Name: saved_search; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_search (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    filters jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: task_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_run (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    state_type public.state_type,
    run_count integer DEFAULT 0 NOT NULL,
    expected_start_time timestamp with time zone,
    next_scheduled_start_time timestamp with time zone,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    total_run_time interval DEFAULT '00:00:00'::interval NOT NULL,
    task_key character varying NOT NULL,
    dynamic_key character varying NOT NULL,
    cache_key character varying,
    cache_expiration timestamp with time zone,
    task_version character varying,
    empirical_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    task_inputs jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    flow_run_id uuid,
    state_id uuid,
    state_name character varying,
    state_timestamp timestamp with time zone,
    flow_run_run_count integer DEFAULT 0 NOT NULL,
    labels jsonb
);


--
-- Name: task_run_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_run_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public.state_type NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    message character varying,
    state_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    data jsonb,
    task_run_id uuid NOT NULL,
    result_artifact_id uuid
);


--
-- Name: task_run_state_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_run_state_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cache_key character varying NOT NULL,
    cache_expiration timestamp with time zone,
    task_run_state_id uuid NOT NULL
);


--
-- Name: variable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    value jsonb
);


--
-- Name: work_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    description character varying,
    type character varying NOT NULL,
    base_job_template jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    concurrency_limit integer,
    default_queue_id uuid,
    status public.work_pool_status DEFAULT 'NOT_READY'::public.work_pool_status NOT NULL,
    last_transitioned_status_at timestamp with time zone,
    last_status_event_id uuid,
    storage_configuration jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: work_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    filter jsonb,
    description character varying DEFAULT ''::character varying NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    concurrency_limit integer,
    last_polled timestamp with time zone,
    priority integer DEFAULT 1 NOT NULL,
    work_pool_id uuid NOT NULL,
    status public.work_queue_status DEFAULT 'NOT_READY'::public.work_queue_status NOT NULL
);


--
-- Name: worker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.worker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying NOT NULL,
    last_heartbeat_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    work_pool_id uuid NOT NULL,
    heartbeat_interval_seconds integer,
    status public.worker_status DEFAULT 'OFFLINE'::public.worker_status NOT NULL
);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: agent pk_agent; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT pk_agent PRIMARY KEY (id);


--
-- Name: artifact pk_artifact; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact
    ADD CONSTRAINT pk_artifact PRIMARY KEY (id);


--
-- Name: artifact_collection pk_artifact_collection; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_collection
    ADD CONSTRAINT pk_artifact_collection PRIMARY KEY (id);


--
-- Name: automation pk_automation; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation
    ADD CONSTRAINT pk_automation PRIMARY KEY (id);


--
-- Name: automation_bucket pk_automation_bucket; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_bucket
    ADD CONSTRAINT pk_automation_bucket PRIMARY KEY (id);


--
-- Name: automation_event_follower pk_automation_event_follower; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_event_follower
    ADD CONSTRAINT pk_automation_event_follower PRIMARY KEY (id);


--
-- Name: automation_related_resource pk_automation_related_resource; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_related_resource
    ADD CONSTRAINT pk_automation_related_resource PRIMARY KEY (id);


--
-- Name: block_document pk_block_document; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_document
    ADD CONSTRAINT pk_block_document PRIMARY KEY (id);


--
-- Name: block_document_reference pk_block_document_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_document_reference
    ADD CONSTRAINT pk_block_document_reference PRIMARY KEY (id);


--
-- Name: block_schema pk_block_schema; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_schema
    ADD CONSTRAINT pk_block_schema PRIMARY KEY (id);


--
-- Name: block_schema_reference pk_block_schema_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_schema_reference
    ADD CONSTRAINT pk_block_schema_reference PRIMARY KEY (id);


--
-- Name: block_type pk_block_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_type
    ADD CONSTRAINT pk_block_type PRIMARY KEY (id);


--
-- Name: composite_trigger_child_firing pk_composite_trigger_child_firing; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.composite_trigger_child_firing
    ADD CONSTRAINT pk_composite_trigger_child_firing PRIMARY KEY (id);


--
-- Name: concurrency_limit pk_concurrency_limit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrency_limit
    ADD CONSTRAINT pk_concurrency_limit PRIMARY KEY (id);


--
-- Name: concurrency_limit_v2 pk_concurrency_limit_v2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrency_limit_v2
    ADD CONSTRAINT pk_concurrency_limit_v2 PRIMARY KEY (id);


--
-- Name: configuration pk_configuration; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration
    ADD CONSTRAINT pk_configuration PRIMARY KEY (id);


--
-- Name: csrf_token pk_csrf_token; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csrf_token
    ADD CONSTRAINT pk_csrf_token PRIMARY KEY (id);


--
-- Name: deployment pk_deployment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment
    ADD CONSTRAINT pk_deployment PRIMARY KEY (id);


--
-- Name: deployment_schedule pk_deployment_schedule; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_schedule
    ADD CONSTRAINT pk_deployment_schedule PRIMARY KEY (id);


--
-- Name: deployment_version pk_deployment_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_version
    ADD CONSTRAINT pk_deployment_version PRIMARY KEY (id);


--
-- Name: event_resources pk_event_resources; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_resources
    ADD CONSTRAINT pk_event_resources PRIMARY KEY (id);


--
-- Name: events pk_events; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT pk_events PRIMARY KEY (id);


--
-- Name: flow pk_flow; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow
    ADD CONSTRAINT pk_flow PRIMARY KEY (id);


--
-- Name: flow_run pk_flow_run; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run
    ADD CONSTRAINT pk_flow_run PRIMARY KEY (id);


--
-- Name: flow_run_input pk_flow_run_input; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run_input
    ADD CONSTRAINT pk_flow_run_input PRIMARY KEY (id);


--
-- Name: flow_run_state pk_flow_run_state; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run_state
    ADD CONSTRAINT pk_flow_run_state PRIMARY KEY (id);


--
-- Name: log pk_log; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT pk_log PRIMARY KEY (id);


--
-- Name: saved_search pk_saved_search; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_search
    ADD CONSTRAINT pk_saved_search PRIMARY KEY (id);


--
-- Name: task_run pk_task_run; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_run
    ADD CONSTRAINT pk_task_run PRIMARY KEY (id);


--
-- Name: task_run_state pk_task_run_state; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_run_state
    ADD CONSTRAINT pk_task_run_state PRIMARY KEY (id);


--
-- Name: task_run_state_cache pk_task_run_state_cache; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_run_state_cache
    ADD CONSTRAINT pk_task_run_state_cache PRIMARY KEY (id);


--
-- Name: variable pk_variable; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variable
    ADD CONSTRAINT pk_variable PRIMARY KEY (id);


--
-- Name: work_pool pk_work_pool; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pool
    ADD CONSTRAINT pk_work_pool PRIMARY KEY (id);


--
-- Name: work_queue pk_work_queue; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_queue
    ADD CONSTRAINT pk_work_queue PRIMARY KEY (id);


--
-- Name: worker pk_worker; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker
    ADD CONSTRAINT pk_worker PRIMARY KEY (id);


--
-- Name: agent uq_agent__name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT uq_agent__name UNIQUE (name);


--
-- Name: artifact_collection uq_artifact_collection__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_collection
    ADD CONSTRAINT uq_artifact_collection__key UNIQUE (key);


--
-- Name: concurrency_limit_v2 uq_concurrency_limit_v2__name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.concurrency_limit_v2
    ADD CONSTRAINT uq_concurrency_limit_v2__name UNIQUE (name);


--
-- Name: configuration uq_configuration__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration
    ADD CONSTRAINT uq_configuration__key UNIQUE (key);


--
-- Name: csrf_token uq_csrf_token__client; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csrf_token
    ADD CONSTRAINT uq_csrf_token__client UNIQUE (client);


--
-- Name: flow uq_flow__name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow
    ADD CONSTRAINT uq_flow__name UNIQUE (name);


--
-- Name: flow_run_input uq_flow_run_input__flow_run_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run_input
    ADD CONSTRAINT uq_flow_run_input__flow_run_id_key UNIQUE (flow_run_id, key);


--
-- Name: saved_search uq_saved_search__name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_search
    ADD CONSTRAINT uq_saved_search__name UNIQUE (name);


--
-- Name: variable uq_variable__name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variable
    ADD CONSTRAINT uq_variable__name UNIQUE (name);


--
-- Name: work_pool uq_work_pool__name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pool
    ADD CONSTRAINT uq_work_pool__name UNIQUE (name);


--
-- Name: work_queue uq_work_queue__work_pool_id_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_queue
    ADD CONSTRAINT uq_work_queue__work_pool_id_name UNIQUE (work_pool_id, name);


--
-- Name: worker uq_worker__work_pool_id_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker
    ADD CONSTRAINT uq_worker__work_pool_id_name UNIQUE (work_pool_id, name);


--
-- Name: ix_ae_follower_scope_leader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ae_follower_scope_leader ON public.automation_event_follower USING btree (scope, leader_event_id);


--
-- Name: ix_agent__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_agent__updated ON public.agent USING btree (updated);


--
-- Name: ix_agent__work_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_agent__work_queue_id ON public.agent USING btree (work_queue_id);


--
-- Name: ix_artifact__flow_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact__flow_run_id ON public.artifact USING btree (flow_run_id);


--
-- Name: ix_artifact__key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact__key ON public.artifact USING btree (key);


--
-- Name: ix_artifact__key_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact__key_created_desc ON public.artifact USING btree (key, created DESC) INCLUDE (id, updated, type, task_run_id, flow_run_id);


--
-- Name: ix_artifact__task_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact__task_run_id ON public.artifact USING btree (task_run_id);


--
-- Name: ix_artifact__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact__updated ON public.artifact USING btree (updated);


--
-- Name: ix_artifact_collection__key_latest_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact_collection__key_latest_id ON public.artifact_collection USING btree (key, latest_id);


--
-- Name: ix_artifact_collection__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_artifact_collection__updated ON public.artifact_collection USING btree (updated);


--
-- Name: ix_automation__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation__updated ON public.automation USING btree (updated);


--
-- Name: ix_automation_bucket__automation_id__end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_bucket__automation_id__end ON public.automation_bucket USING btree (automation_id, "end");


--
-- Name: ix_automation_bucket__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_bucket__updated ON public.automation_bucket USING btree (updated);


--
-- Name: ix_automation_event_follower__leader_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_event_follower__leader_event_id ON public.automation_event_follower USING btree (leader_event_id);


--
-- Name: ix_automation_event_follower__received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_event_follower__received ON public.automation_event_follower USING btree (received);


--
-- Name: ix_automation_event_follower__scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_event_follower__scope ON public.automation_event_follower USING btree (scope);


--
-- Name: ix_automation_event_follower__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_event_follower__updated ON public.automation_event_follower USING btree (updated);


--
-- Name: ix_automation_related_resource__resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_related_resource__resource_id ON public.automation_related_resource USING btree (resource_id);


--
-- Name: ix_automation_related_resource__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_automation_related_resource__updated ON public.automation_related_resource USING btree (updated);


--
-- Name: ix_block_document__block_type_name__name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_document__block_type_name__name ON public.block_document USING btree (block_type_name, name);


--
-- Name: ix_block_document__is_anonymous; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_document__is_anonymous ON public.block_document USING btree (is_anonymous);


--
-- Name: ix_block_document__name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_document__name ON public.block_document USING btree (name);


--
-- Name: ix_block_document__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_document__updated ON public.block_document USING btree (updated);


--
-- Name: ix_block_document_reference__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_document_reference__updated ON public.block_document_reference USING btree (updated);


--
-- Name: ix_block_schema__block_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_schema__block_type_id ON public.block_schema USING btree (block_type_id);


--
-- Name: ix_block_schema__capabilities; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_schema__capabilities ON public.block_schema USING gin (capabilities);


--
-- Name: ix_block_schema__created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_schema__created ON public.block_schema USING btree (created);


--
-- Name: ix_block_schema__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_schema__updated ON public.block_schema USING btree (updated);


--
-- Name: ix_block_schema_reference__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_schema_reference__updated ON public.block_schema_reference USING btree (updated);


--
-- Name: ix_block_type__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_block_type__updated ON public.block_type USING btree (updated);


--
-- Name: ix_composite_trigger_child_firing__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_composite_trigger_child_firing__updated ON public.composite_trigger_child_firing USING btree (updated);


--
-- Name: ix_concurrency_limit__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_concurrency_limit__updated ON public.concurrency_limit USING btree (updated);


--
-- Name: ix_concurrency_limit_v2__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_concurrency_limit_v2__updated ON public.concurrency_limit_v2 USING btree (updated);


--
-- Name: ix_configuration__key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_configuration__key ON public.configuration USING btree (key);


--
-- Name: ix_configuration__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_configuration__updated ON public.configuration USING btree (updated);


--
-- Name: ix_csrf_token__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_csrf_token__updated ON public.csrf_token USING btree (updated);


--
-- Name: ix_deployment__created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__created ON public.deployment USING btree (created);


--
-- Name: ix_deployment__flow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__flow_id ON public.deployment USING btree (flow_id);


--
-- Name: ix_deployment__paused; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__paused ON public.deployment USING btree (paused);


--
-- Name: ix_deployment__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__updated ON public.deployment USING btree (updated);


--
-- Name: ix_deployment__version_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__version_id ON public.deployment USING btree (version_id);


--
-- Name: ix_deployment__work_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__work_queue_id ON public.deployment USING btree (work_queue_id);


--
-- Name: ix_deployment__work_queue_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment__work_queue_name ON public.deployment USING btree (work_queue_name);


--
-- Name: ix_deployment_schedule__deployment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_schedule__deployment_id ON public.deployment_schedule USING btree (deployment_id);


--
-- Name: ix_deployment_schedule__deployment_id__slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_deployment_schedule__deployment_id__slug ON public.deployment_schedule USING btree (deployment_id, slug) WHERE (slug IS NOT NULL);


--
-- Name: ix_deployment_schedule__slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_schedule__slug ON public.deployment_schedule USING btree (slug);


--
-- Name: ix_deployment_schedule__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_schedule__updated ON public.deployment_schedule USING btree (updated);


--
-- Name: ix_deployment_version__deployment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_version__deployment_id ON public.deployment_version USING btree (deployment_id);


--
-- Name: ix_deployment_version__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_version__updated ON public.deployment_version USING btree (updated);


--
-- Name: ix_deployment_version__work_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_version__work_queue_id ON public.deployment_version USING btree (work_queue_id);


--
-- Name: ix_deployment_version__work_queue_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_deployment_version__work_queue_name ON public.deployment_version USING btree (work_queue_name);


--
-- Name: ix_event_resources__resource_id__occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_event_resources__resource_id__occurred ON public.event_resources USING btree (resource_id, occurred);


--
-- Name: ix_event_resources__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_event_resources__updated ON public.event_resources USING btree (updated);


--
-- Name: ix_events__event__id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__event__id ON public.events USING btree (event, id);


--
-- Name: ix_events__event_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__event_occurred ON public.events USING btree (event, occurred);


--
-- Name: ix_events__event_occurred_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__event_occurred_id ON public.events USING btree (event, occurred, id);


--
-- Name: ix_events__event_resource_id_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__event_resource_id_occurred ON public.events USING btree (event, resource_id, occurred);


--
-- Name: ix_events__occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__occurred ON public.events USING btree (occurred);


--
-- Name: ix_events__occurred_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__occurred_id ON public.events USING btree (occurred, id);


--
-- Name: ix_events__related_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__related_gin ON public.events USING gin (related);


--
-- Name: ix_events__related_resource_ids_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__related_resource_ids_gin ON public.events USING gin (related_resource_ids);


--
-- Name: ix_events__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events__updated ON public.events USING btree (updated);


--
-- Name: ix_flow__created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow__created ON public.flow USING btree (created);


--
-- Name: ix_flow__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow__updated ON public.flow USING btree (updated);


--
-- Name: ix_flow_run__coalesce_start_time_expected_start_time_asc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__coalesce_start_time_expected_start_time_asc ON public.flow_run USING btree (COALESCE(start_time, expected_start_time));


--
-- Name: ix_flow_run__coalesce_start_time_expected_start_time_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__coalesce_start_time_expected_start_time_desc ON public.flow_run USING btree (COALESCE(start_time, expected_start_time) DESC);


--
-- Name: ix_flow_run__deployment_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__deployment_version ON public.flow_run USING btree (deployment_version);


--
-- Name: ix_flow_run__end_time_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__end_time_desc ON public.flow_run USING btree (end_time DESC);


--
-- Name: ix_flow_run__expected_start_time_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__expected_start_time_desc ON public.flow_run USING btree (expected_start_time DESC);


--
-- Name: ix_flow_run__flow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__flow_id ON public.flow_run USING btree (flow_id);


--
-- Name: ix_flow_run__flow_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__flow_version ON public.flow_run USING btree (flow_version);


--
-- Name: ix_flow_run__infrastructure_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__infrastructure_document_id ON public.flow_run USING btree (infrastructure_document_id);


--
-- Name: ix_flow_run__name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__name ON public.flow_run USING btree (name);


--
-- Name: ix_flow_run__next_scheduled_start_time_asc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__next_scheduled_start_time_asc ON public.flow_run USING btree (next_scheduled_start_time);


--
-- Name: ix_flow_run__parent_task_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__parent_task_run_id ON public.flow_run USING btree (parent_task_run_id);


--
-- Name: ix_flow_run__scheduler_deployment_id_auto_scheduled_next_schedu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__scheduler_deployment_id_auto_scheduled_next_schedu ON public.flow_run USING btree (deployment_id, auto_scheduled, next_scheduled_start_time) WHERE (state_type = 'SCHEDULED'::public.state_type);


--
-- Name: ix_flow_run__start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__start_time ON public.flow_run USING btree (start_time);


--
-- Name: ix_flow_run__state_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__state_id ON public.flow_run USING btree (state_id);


--
-- Name: ix_flow_run__state_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__state_name ON public.flow_run USING btree (state_name);


--
-- Name: ix_flow_run__state_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__state_timestamp ON public.flow_run USING btree (state_timestamp);


--
-- Name: ix_flow_run__state_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__state_type ON public.flow_run USING btree (state_type);


--
-- Name: ix_flow_run__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__updated ON public.flow_run USING btree (updated);


--
-- Name: ix_flow_run__work_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__work_queue_id ON public.flow_run USING btree (work_queue_id);


--
-- Name: ix_flow_run__work_queue_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run__work_queue_name ON public.flow_run USING btree (work_queue_name);


--
-- Name: ix_flow_run_input__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run_input__updated ON public.flow_run_input USING btree (updated);


--
-- Name: ix_flow_run_state__name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run_state__name ON public.flow_run_state USING btree (name);


--
-- Name: ix_flow_run_state__result_artifact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run_state__result_artifact_id ON public.flow_run_state USING btree (result_artifact_id);


--
-- Name: ix_flow_run_state__type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run_state__type ON public.flow_run_state USING btree (type);


--
-- Name: ix_flow_run_state__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flow_run_state__updated ON public.flow_run_state USING btree (updated);


--
-- Name: ix_log__flow_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log__flow_run_id ON public.log USING btree (flow_run_id);


--
-- Name: ix_log__flow_run_id_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log__flow_run_id_timestamp ON public.log USING btree (flow_run_id, "timestamp");


--
-- Name: ix_log__level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log__level ON public.log USING btree (level);


--
-- Name: ix_log__task_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log__task_run_id ON public.log USING btree (task_run_id);


--
-- Name: ix_log__timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log__timestamp ON public.log USING btree ("timestamp");


--
-- Name: ix_log__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log__updated ON public.log USING btree (updated);


--
-- Name: ix_saved_search__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_saved_search__updated ON public.saved_search USING btree (updated);


--
-- Name: ix_task_run__end_time_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__end_time_desc ON public.task_run USING btree (end_time DESC);


--
-- Name: ix_task_run__expected_start_time_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__expected_start_time_desc ON public.task_run USING btree (expected_start_time DESC);


--
-- Name: ix_task_run__flow_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__flow_run_id ON public.task_run USING btree (flow_run_id);


--
-- Name: ix_task_run__name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__name ON public.task_run USING btree (name);


--
-- Name: ix_task_run__next_scheduled_start_time_asc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__next_scheduled_start_time_asc ON public.task_run USING btree (next_scheduled_start_time);


--
-- Name: ix_task_run__start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__start_time ON public.task_run USING btree (start_time);


--
-- Name: ix_task_run__state_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__state_id ON public.task_run USING btree (state_id);


--
-- Name: ix_task_run__state_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__state_name ON public.task_run USING btree (state_name);


--
-- Name: ix_task_run__state_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__state_timestamp ON public.task_run USING btree (state_timestamp);


--
-- Name: ix_task_run__state_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__state_type ON public.task_run USING btree (state_type);


--
-- Name: ix_task_run__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run__updated ON public.task_run USING btree (updated);


--
-- Name: ix_task_run_state__name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run_state__name ON public.task_run_state USING btree (name);


--
-- Name: ix_task_run_state__result_artifact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run_state__result_artifact_id ON public.task_run_state USING btree (result_artifact_id);


--
-- Name: ix_task_run_state__type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run_state__type ON public.task_run_state USING btree (type);


--
-- Name: ix_task_run_state__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run_state__updated ON public.task_run_state USING btree (updated);


--
-- Name: ix_task_run_state_cache__cache_key_created_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run_state_cache__cache_key_created_desc ON public.task_run_state_cache USING btree (cache_key, created DESC);


--
-- Name: ix_task_run_state_cache__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_task_run_state_cache__updated ON public.task_run_state_cache USING btree (updated);


--
-- Name: ix_variable__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_variable__updated ON public.variable USING btree (updated);


--
-- Name: ix_work_pool__type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_pool__type ON public.work_pool USING btree (type);


--
-- Name: ix_work_pool__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_pool__updated ON public.work_pool USING btree (updated);


--
-- Name: ix_work_queue__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_queue__updated ON public.work_queue USING btree (updated);


--
-- Name: ix_work_queue__work_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_queue__work_pool_id ON public.work_queue USING btree (work_pool_id);


--
-- Name: ix_work_queue__work_pool_id_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_queue__work_pool_id_priority ON public.work_queue USING btree (work_pool_id, priority);


--
-- Name: ix_worker__updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_worker__updated ON public.worker USING btree (updated);


--
-- Name: ix_worker__work_pool_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_worker__work_pool_id ON public.worker USING btree (work_pool_id);


--
-- Name: ix_worker__work_pool_id_last_heartbeat_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_worker__work_pool_id_last_heartbeat_time ON public.worker USING btree (work_pool_id, last_heartbeat_time);


--
-- Name: trgm_ix_block_document_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_block_document_name ON public.block_document USING gin (name public.gin_trgm_ops);


--
-- Name: trgm_ix_block_type_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_block_type_name ON public.block_type USING gin (name public.gin_trgm_ops);


--
-- Name: trgm_ix_deployment_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_deployment_name ON public.deployment USING gin (name public.gin_trgm_ops);


--
-- Name: trgm_ix_flow_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_flow_name ON public.flow USING gin (name public.gin_trgm_ops);


--
-- Name: trgm_ix_flow_run_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_flow_run_name ON public.flow_run USING gin (name public.gin_trgm_ops);


--
-- Name: trgm_ix_task_run_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_task_run_name ON public.task_run USING gin (name public.gin_trgm_ops);


--
-- Name: trgm_ix_work_queue_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trgm_ix_work_queue_name ON public.work_queue USING gin (name public.gin_trgm_ops);


--
-- Name: uq_automation_bucket__automation_id__trigger_id__bucketing_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_automation_bucket__automation_id__trigger_id__bucketing_key ON public.automation_bucket USING btree (automation_id, trigger_id, bucketing_key);


--
-- Name: uq_automation_related_resource__automation_id__resource_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_automation_related_resource__automation_id__resource_id ON public.automation_related_resource USING btree (automation_id, resource_id);


--
-- Name: uq_block__type_id_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_block__type_id_name ON public.block_document USING btree (block_type_id, name);


--
-- Name: uq_block_schema__checksum_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_block_schema__checksum_version ON public.block_schema USING btree (checksum, version);


--
-- Name: uq_block_type__slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_block_type__slug ON public.block_type USING btree (slug);


--
-- Name: uq_composite_trigger_child_firing__a_id__pt_id__ct__id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_composite_trigger_child_firing__a_id__pt_id__ct__id ON public.composite_trigger_child_firing USING btree (automation_id, parent_trigger_id, child_trigger_id);


--
-- Name: uq_concurrency_limit__tag; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_concurrency_limit__tag ON public.concurrency_limit USING btree (tag);


--
-- Name: uq_deployment__flow_id_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_deployment__flow_id_name ON public.deployment USING btree (flow_id, name);


--
-- Name: uq_deployment_version__deployment__branch; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_deployment_version__deployment__branch ON public.deployment_version USING btree (deployment_id, branch);


--
-- Name: uq_flow_run__flow_id_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_flow_run__flow_id_idempotency_key ON public.flow_run USING btree (flow_id, idempotency_key);


--
-- Name: uq_flow_run_state__flow_run_id_timestamp_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_flow_run_state__flow_run_id_timestamp_desc ON public.flow_run_state USING btree (flow_run_id, "timestamp" DESC);


--
-- Name: uq_follower_for_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_follower_for_scope ON public.automation_event_follower USING btree (scope, follower_event_id);


--
-- Name: uq_task_run__flow_run_id_task_key_dynamic_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_task_run__flow_run_id_task_key_dynamic_key ON public.task_run USING btree (flow_run_id, task_key, dynamic_key);


--
-- Name: uq_task_run_state__task_run_id_timestamp_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_task_run_state__task_run_id_timestamp_desc ON public.task_run_state USING btree (task_run_id, "timestamp" DESC);


--
-- Name: agent fk_agent__work_queue_id__work_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent
    ADD CONSTRAINT fk_agent__work_queue_id__work_queue FOREIGN KEY (work_queue_id) REFERENCES public.work_queue(id);


--
-- Name: automation_bucket fk_automation_bucket__automation_id__automation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_bucket
    ADD CONSTRAINT fk_automation_bucket__automation_id__automation FOREIGN KEY (automation_id) REFERENCES public.automation(id) ON DELETE CASCADE;


--
-- Name: automation_related_resource fk_automation_related_resource__automation_id__automation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_related_resource
    ADD CONSTRAINT fk_automation_related_resource__automation_id__automation FOREIGN KEY (automation_id) REFERENCES public.automation(id) ON DELETE CASCADE;


--
-- Name: block_document fk_block__block_schema_id__block_schema; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_document
    ADD CONSTRAINT fk_block__block_schema_id__block_schema FOREIGN KEY (block_schema_id) REFERENCES public.block_schema(id) ON DELETE CASCADE;


--
-- Name: block_document fk_block_document__block_type_id__block_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_document
    ADD CONSTRAINT fk_block_document__block_type_id__block_type FOREIGN KEY (block_type_id) REFERENCES public.block_type(id) ON DELETE CASCADE;


--
-- Name: block_document_reference fk_block_document_reference__parent_block_document_id___328f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_document_reference
    ADD CONSTRAINT fk_block_document_reference__parent_block_document_id___328f FOREIGN KEY (parent_block_document_id) REFERENCES public.block_document(id) ON DELETE CASCADE;


--
-- Name: block_document_reference fk_block_document_reference__reference_block_document_i_5759; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_document_reference
    ADD CONSTRAINT fk_block_document_reference__reference_block_document_i_5759 FOREIGN KEY (reference_block_document_id) REFERENCES public.block_document(id) ON DELETE CASCADE;


--
-- Name: block_schema fk_block_schema__block_type_id__block_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_schema
    ADD CONSTRAINT fk_block_schema__block_type_id__block_type FOREIGN KEY (block_type_id) REFERENCES public.block_type(id) ON DELETE CASCADE;


--
-- Name: block_schema_reference fk_block_schema_reference__parent_block_schema_id__block_schema; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_schema_reference
    ADD CONSTRAINT fk_block_schema_reference__parent_block_schema_id__block_schema FOREIGN KEY (parent_block_schema_id) REFERENCES public.block_schema(id) ON DELETE CASCADE;


--
-- Name: block_schema_reference fk_block_schema_reference__reference_block_schema_id__b_6e5d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_schema_reference
    ADD CONSTRAINT fk_block_schema_reference__reference_block_schema_id__b_6e5d FOREIGN KEY (reference_block_schema_id) REFERENCES public.block_schema(id) ON DELETE CASCADE;


--
-- Name: composite_trigger_child_firing fk_composite_trigger_child_firing__automation_id__automation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.composite_trigger_child_firing
    ADD CONSTRAINT fk_composite_trigger_child_firing__automation_id__automation FOREIGN KEY (automation_id) REFERENCES public.automation(id) ON DELETE CASCADE;


--
-- Name: deployment fk_deployment__concurrency_limit_id__concurrency_limit_v2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment
    ADD CONSTRAINT fk_deployment__concurrency_limit_id__concurrency_limit_v2 FOREIGN KEY (concurrency_limit_id) REFERENCES public.concurrency_limit_v2(id) ON DELETE SET NULL;


--
-- Name: deployment fk_deployment__flow_id__flow; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment
    ADD CONSTRAINT fk_deployment__flow_id__flow FOREIGN KEY (flow_id) REFERENCES public.flow(id) ON DELETE CASCADE;


--
-- Name: deployment fk_deployment__infrastructure_document_id__block_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment
    ADD CONSTRAINT fk_deployment__infrastructure_document_id__block_document FOREIGN KEY (infrastructure_document_id) REFERENCES public.block_document(id) ON DELETE CASCADE;


--
-- Name: deployment fk_deployment__storage_document_id__block_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment
    ADD CONSTRAINT fk_deployment__storage_document_id__block_document FOREIGN KEY (storage_document_id) REFERENCES public.block_document(id) ON DELETE CASCADE;


--
-- Name: deployment fk_deployment__work_queue_id__work_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment
    ADD CONSTRAINT fk_deployment__work_queue_id__work_queue FOREIGN KEY (work_queue_id) REFERENCES public.work_queue(id) ON DELETE SET NULL;


--
-- Name: deployment_schedule fk_deployment_schedule__deployment_id__deployment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_schedule
    ADD CONSTRAINT fk_deployment_schedule__deployment_id__deployment FOREIGN KEY (deployment_id) REFERENCES public.deployment(id) ON DELETE CASCADE;


--
-- Name: deployment_version fk_deployment_version__deployment_id__deployment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_version
    ADD CONSTRAINT fk_deployment_version__deployment_id__deployment FOREIGN KEY (deployment_id) REFERENCES public.deployment(id) ON DELETE CASCADE;


--
-- Name: deployment_version fk_deployment_version__work_queue_id__work_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deployment_version
    ADD CONSTRAINT fk_deployment_version__work_queue_id__work_queue FOREIGN KEY (work_queue_id) REFERENCES public.work_queue(id) ON DELETE SET NULL;


--
-- Name: flow_run fk_flow_run__flow_id__flow; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run
    ADD CONSTRAINT fk_flow_run__flow_id__flow FOREIGN KEY (flow_id) REFERENCES public.flow(id) ON DELETE CASCADE;


--
-- Name: flow_run fk_flow_run__infrastructure_document_id__block_document; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run
    ADD CONSTRAINT fk_flow_run__infrastructure_document_id__block_document FOREIGN KEY (infrastructure_document_id) REFERENCES public.block_document(id) ON DELETE CASCADE;


--
-- Name: flow_run fk_flow_run__parent_task_run_id__task_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run
    ADD CONSTRAINT fk_flow_run__parent_task_run_id__task_run FOREIGN KEY (parent_task_run_id) REFERENCES public.task_run(id) ON DELETE SET NULL;


--
-- Name: flow_run fk_flow_run__state_id__flow_run_state; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run
    ADD CONSTRAINT fk_flow_run__state_id__flow_run_state FOREIGN KEY (state_id) REFERENCES public.flow_run_state(id) ON DELETE SET NULL;


--
-- Name: flow_run fk_flow_run__work_queue_id__work_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run
    ADD CONSTRAINT fk_flow_run__work_queue_id__work_queue FOREIGN KEY (work_queue_id) REFERENCES public.work_queue(id) ON DELETE SET NULL;


--
-- Name: flow_run_input fk_flow_run_input__flow_run_id__flow_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run_input
    ADD CONSTRAINT fk_flow_run_input__flow_run_id__flow_run FOREIGN KEY (flow_run_id) REFERENCES public.flow_run(id) ON DELETE CASCADE;


--
-- Name: flow_run_state fk_flow_run_state__flow_run_id__flow_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run_state
    ADD CONSTRAINT fk_flow_run_state__flow_run_id__flow_run FOREIGN KEY (flow_run_id) REFERENCES public.flow_run(id) ON DELETE CASCADE;


--
-- Name: flow_run_state fk_flow_run_state__result_artifact_id__artifact; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flow_run_state
    ADD CONSTRAINT fk_flow_run_state__result_artifact_id__artifact FOREIGN KEY (result_artifact_id) REFERENCES public.artifact(id) ON DELETE SET NULL;


--
-- Name: task_run fk_task_run__flow_run_id__flow_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_run
    ADD CONSTRAINT fk_task_run__flow_run_id__flow_run FOREIGN KEY (flow_run_id) REFERENCES public.flow_run(id) ON DELETE CASCADE;


--
-- Name: task_run_state fk_task_run_state__result_artifact_id__artifact; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_run_state
    ADD CONSTRAINT fk_task_run_state__result_artifact_id__artifact FOREIGN KEY (result_artifact_id) REFERENCES public.artifact(id) ON DELETE SET NULL;


--
-- Name: task_run_state fk_task_run_state__task_run_id__task_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_run_state
    ADD CONSTRAINT fk_task_run_state__task_run_id__task_run FOREIGN KEY (task_run_id) REFERENCES public.task_run(id) ON DELETE CASCADE;


--
-- Name: work_pool fk_work_pool__default_queue_id__work_queue; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_pool
    ADD CONSTRAINT fk_work_pool__default_queue_id__work_queue FOREIGN KEY (default_queue_id) REFERENCES public.work_queue(id) ON DELETE RESTRICT;


--
-- Name: work_queue fk_work_queue__work_pool_id__work_pool; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_queue
    ADD CONSTRAINT fk_work_queue__work_pool_id__work_pool FOREIGN KEY (work_pool_id) REFERENCES public.work_pool(id) ON DELETE CASCADE;


--
-- Name: worker fk_worker__work_pool_id__work_pool; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.worker
    ADD CONSTRAINT fk_worker__work_pool_id__work_pool FOREIGN KEY (work_pool_id) REFERENCES public.work_pool(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict SdpbYSrywaXrJPMbVszNH4TL581X9S4ltzjZtEgiufmXBEKahvZyU5i4KRv4c6B

