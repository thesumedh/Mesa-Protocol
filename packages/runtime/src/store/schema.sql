-- Mesa Runtime: Postgres Schema
-- Run once on first start

CREATE TABLE IF NOT EXISTS flows (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  definition   JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executions (
  id           TEXT PRIMARY KEY,
  flow_id      TEXT NOT NULL REFERENCES flows(id),
  status       TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | RUNNING | COMPLETED | FAILED | PERMANENTLY_FAILED
  context      JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS executions_status_idx ON executions(status);

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
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS steps_execution_idx ON steps(execution_id, step_index);

CREATE TABLE IF NOT EXISTS events (
  id           BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  type         TEXT NOT NULL,
  -- flow.started | step.started | step.completed | step.failed |
  -- step.suspended | step.resumed | flow.completed | flow.failed |
  -- webhook.received | webhook.sent
  payload      JSONB,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_execution_idx ON events(execution_id, timestamp);
