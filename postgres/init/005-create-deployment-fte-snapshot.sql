\connect metadata

SET ROLE metadata;

CREATE TABLE IF NOT EXISTS deployment_fte_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_run_id UUID NOT NULL UNIQUE,
  deployment_id UUID NOT NULL,
  flow_run_start_time TIMESTAMPTZ,
  flow_run_end_time TIMESTAMPTZ,
  flow_run_state_type VARCHAR(32),
  bot_run_time_seconds NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bot_run_time_seconds >= 0),
  fte_items NUMERIC(14,2) NOT NULL CHECK (fte_items > 0),
  fte_items_source VARCHAR(16) NOT NULL CHECK (fte_items_source IN ('LOG', 'CONFIG', 'DEFAULT')),
  avg_human_minutes_per_case NUMERIC(10,2) NOT NULL CHECK (avg_human_minutes_per_case > 0),
  avg_cases_per_run NUMERIC(10,2) CHECK (avg_cases_per_run IS NULL OR avg_cases_per_run > 0),
  analyst_hourly_cost NUMERIC(10,2) NOT NULL CHECK (analyst_hourly_cost >= 0),
  fte_hours_per_year INTEGER NOT NULL CHECK (fte_hours_per_year > 0),
  human_minutes NUMERIC(14,2) NOT NULL,
  hours_saved NUMERIC(14,4) NOT NULL,
  fte_saved NUMERIC(14,6) NOT NULL,
  est_cost_avoided NUMERIC(14,2) NOT NULL,
  extra_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_deployment_fte_snapshot_deployment_end_time
  ON deployment_fte_snapshot (deployment_id, flow_run_end_time DESC);
CREATE INDEX IF NOT EXISTS ix_deployment_fte_snapshot_end_time
  ON deployment_fte_snapshot (flow_run_end_time DESC);

CREATE OR REPLACE FUNCTION set_deployment_fte_snapshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deployment_fte_snapshot_set_updated_at ON deployment_fte_snapshot;
CREATE TRIGGER trg_deployment_fte_snapshot_set_updated_at
BEFORE UPDATE ON deployment_fte_snapshot
FOR EACH ROW
EXECUTE FUNCTION set_deployment_fte_snapshot_updated_at();

RESET ROLE;
