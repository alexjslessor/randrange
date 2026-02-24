-- Create role + database for arch-auth service.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arch_auth') THEN
    CREATE ROLE arch_auth LOGIN PASSWORD 'arch_auth';
  END IF;
END
$$;

SELECT 'CREATE DATABASE users OWNER arch_auth'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'users')
\gexec

GRANT ALL PRIVILEGES ON DATABASE users TO arch_auth;
