\connect metadata

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET ROLE metadata;

CREATE TABLE IF NOT EXISTS deployment_fte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL UNIQUE,
  avg_human_minutes_per_case NUMERIC(10,2) NOT NULL CHECK (avg_human_minutes_per_case > 0),
  avg_cases_per_run NUMERIC(10,2) CHECK (avg_cases_per_run IS NULL OR avg_cases_per_run > 0),
  analyst_hourly_cost NUMERIC(10,2) NOT NULL CHECK (analyst_hourly_cost >= 0),
  fte_hours_per_year INTEGER NOT NULL DEFAULT 2080 CHECK (fte_hours_per_year > 0),
  confidence_level VARCHAR(16) CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
  description TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  extra_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_deployment_fte_is_active ON deployment_fte (is_active);
CREATE INDEX IF NOT EXISTS ix_deployment_fte_updated_at ON deployment_fte (updated_at DESC);

CREATE TABLE IF NOT EXISTS flow_run_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_run_id UUID NOT NULL UNIQUE,
  deployment_id UUID NOT NULL,
  note_text TEXT NOT NULL,
  updated_by_user_id VARCHAR(128),
  updated_by_username VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_flow_run_notes_deployment_id ON flow_run_notes (deployment_id);
CREATE INDEX IF NOT EXISTS ix_flow_run_notes_updated_at ON flow_run_notes (updated_at DESC);

CREATE OR REPLACE FUNCTION set_deployment_fte_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deployment_fte_set_updated_at ON deployment_fte;
CREATE TRIGGER trg_deployment_fte_set_updated_at
BEFORE UPDATE ON deployment_fte
FOR EACH ROW
EXECUTE FUNCTION set_deployment_fte_updated_at();

CREATE OR REPLACE FUNCTION set_flow_run_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flow_run_notes_set_updated_at ON flow_run_notes;
CREATE TRIGGER trg_flow_run_notes_set_updated_at
BEFORE UPDATE ON flow_run_notes
FOR EACH ROW
EXECUTE FUNCTION set_flow_run_notes_updated_at();

GRANT USAGE ON SCHEMA public TO metadata;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO metadata;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO metadata;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO metadata;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO metadata;

RESET ROLE;
