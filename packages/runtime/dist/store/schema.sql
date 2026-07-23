-- Mesa Runtime: Postgres Schema (Production Hardened)
-- Run once on first start

CREATE TABLE IF NOT EXISTS flows (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL DEFAULT '1.0.0',
  definition   JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flow_versions (
  id           TEXT PRIMARY KEY,
  flow_id      TEXT NOT NULL REFERENCES flows(id),
  version      TEXT NOT NULL,
  definition   JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flow_id, version)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key          TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executions (
  id           TEXT PRIMARY KEY,
  flow_id      TEXT NOT NULL REFERENCES flows(id),
  status       TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | RUNNING | SUSPENDED | COMPLETED | FAILED | CANCELLED
  context      JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 0,
  locked_by    TEXT,
  locked_until TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS executions_status_idx ON executions(status, locked_until);

CREATE TABLE IF NOT EXISTS steps (
  id           TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  step_index   INTEGER NOT NULL,
  name         TEXT NOT NULL,
  provider     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | RUNNING | SUSPENDED | COMPLETED | FAILED | RETRYING
  input        JSONB,
  output       JSONB,
  error        TEXT,
  attempts     INTEGER NOT NULL DEFAULT 0,
  next_retry   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (execution_id, step_index)
);
CREATE INDEX IF NOT EXISTS steps_execution_idx ON steps(execution_id, step_index);

CREATE TABLE IF NOT EXISTS webhook_events (
  id             TEXT PRIMARY KEY,
  suspension_key TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}',
  signature      TEXT,
  verified       BOOLEAN NOT NULL DEFAULT TRUE,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS webhook_key_idx ON webhook_events(suspension_key);

CREATE TABLE IF NOT EXISTS events (
  id           BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  type         TEXT NOT NULL,
  -- flow.started | step.started | step.completed | step.failed |
  -- step.suspended | step.resumed | flow.completed | flow.failed |
  -- webhook.received | webhook.sent | flow.cancelled
  payload      JSONB,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_execution_idx ON events(execution_id, timestamp);
