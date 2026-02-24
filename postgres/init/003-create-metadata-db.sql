-- Create role + database for deployment metadata.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metadata') THEN
    CREATE ROLE metadata LOGIN PASSWORD 'metadata';
  END IF;
END
$$;

SELECT 'CREATE DATABASE metadata OWNER metadata'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'metadata')
\gexec

GRANT ALL PRIVILEGES ON DATABASE metadata TO metadata;
