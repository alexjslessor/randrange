\connect users

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SET ROLE arch_auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authprovidertype') THEN
    CREATE TYPE authprovidertype AS ENUM ('local_password', 'entra_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pkcemethod') THEN
    CREATE TYPE pkcemethod AS ENUM ('S256');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS realms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  external_id VARCHAR(255),
  auth_provider authprovidertype NOT NULL DEFAULT 'local_password',
  is_superuser BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_external_id ON users (external_id);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  realm_id VARCHAR NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_memberships UNIQUE (user_id, realm_id)
);
CREATE INDEX IF NOT EXISTS ix_tenant_memberships_user_id ON tenant_memberships (user_id);
CREATE INDEX IF NOT EXISTS ix_tenant_memberships_realm_id ON tenant_memberships (realm_id);

CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  realm_id VARCHAR NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_groups_realm_name UNIQUE (realm_id, name)
);
CREATE INDEX IF NOT EXISTS ix_groups_realm_id ON groups (realm_id);

CREATE TABLE IF NOT EXISTS user_group_memberships (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  is_group_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_group_memberships UNIQUE (user_id, group_id)
);
CREATE INDEX IF NOT EXISTS ix_user_group_memberships_user_id ON user_group_memberships (user_id);
CREATE INDEX IF NOT EXISTS ix_user_group_memberships_group_id ON user_group_memberships (group_id);
CREATE INDEX IF NOT EXISTS ix_user_group_memberships_user_admin ON user_group_memberships (user_id, is_group_admin);

CREATE TABLE IF NOT EXISTS oauth_clients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  realm_id VARCHAR NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  client_id VARCHAR(128) NOT NULL UNIQUE,
  client_secret_hash VARCHAR(255),
  is_confidential BOOLEAN NOT NULL DEFAULT false,
  redirect_uris JSONB NOT NULL DEFAULT '[]'::jsonb,
  scopes JSONB NOT NULL DEFAULT '["openid","profile","read"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_oauth_clients_realm_id ON oauth_clients (realm_id);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  realm_id VARCHAR NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  client_id VARCHAR NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_permissions_client_code UNIQUE (client_id, code)
);
CREATE INDEX IF NOT EXISTS ix_permissions_realm_id ON permissions (realm_id);
CREATE INDEX IF NOT EXISTS ix_permissions_client_id ON permissions (client_id);
CREATE INDEX IF NOT EXISTS ix_permissions_code ON permissions (code);

CREATE TABLE IF NOT EXISTS group_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id VARCHAR NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  permission_id VARCHAR NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_group_permissions UNIQUE (group_id, permission_id)
);
CREATE INDEX IF NOT EXISTS ix_group_permissions_group_id ON group_permissions (group_id);
CREATE INDEX IF NOT EXISTS ix_group_permissions_permission_id ON group_permissions (permission_id);

CREATE TABLE IF NOT EXISTS authorization_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code_hash VARCHAR(255) NOT NULL UNIQUE,
  oauth_client_id VARCHAR NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  realm_id VARCHAR NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  redirect_uri VARCHAR(512) NOT NULL,
  scope VARCHAR(512) NOT NULL DEFAULT 'openid profile',
  nonce VARCHAR(255),
  code_challenge VARCHAR(255) NOT NULL,
  code_challenge_method pkcemethod NOT NULL DEFAULT 'S256',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_authorization_codes_oauth_client_id ON authorization_codes (oauth_client_id);
CREATE INDEX IF NOT EXISTS ix_authorization_codes_user_id ON authorization_codes (user_id);
CREATE INDEX IF NOT EXISTS ix_authorization_codes_realm_id ON authorization_codes (realm_id);
CREATE INDEX IF NOT EXISTS ix_authorization_codes_expires_at ON authorization_codes (expires_at);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  oauth_client_id VARCHAR NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
  realm_id VARCHAR NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  scope VARCHAR(512) NOT NULL DEFAULT 'openid profile',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_oauth_client_id ON refresh_tokens (oauth_client_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at ON refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS signing_keys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kid VARCHAR(128) NOT NULL UNIQUE,
  algorithm VARCHAR(32) NOT NULL DEFAULT 'RS256',
  private_pem TEXT NOT NULL,
  public_pem TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_signing_keys_kid ON signing_keys (kid);
CREATE INDEX IF NOT EXISTS ix_signing_keys_is_active ON signing_keys (is_active);

INSERT INTO permissions (realm_id, client_id, code, description)
SELECT
  oauth_clients.realm_id,
  oauth_clients.id,
  seed.code,
  seed.description
FROM oauth_clients
CROSS JOIN (
  VALUES
    ('read', 'Read-only access'),
    ('write', 'Read/write access')
) AS seed(code, description)
ON CONFLICT (client_id, code) DO NOTHING;

GRANT USAGE ON SCHEMA public TO arch_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arch_auth;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO arch_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arch_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO arch_auth;

RESET ROLE;
