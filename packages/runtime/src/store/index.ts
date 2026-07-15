import { Pool } from 'pg';
import { InMemoryPool } from './mockDb';
import * as fs from 'fs';
import * as path from 'path';

let pool: any = null;

export function getPool(): any {
  if (!pool) {
    if (process.env.DATABASE_URL === 'mock' || process.env.NODE_ENV === 'test') {
      console.log('[MesaRuntime] Initializing InMemoryPool for testing/mocking.');
      pool = new InMemoryPool();
    } else {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://mesa:mesa@localhost:5432/mesa',
      });
    }
  }
  return pool;
}

export async function initSchema(): Promise<void> {
  if (process.env.DATABASE_URL === 'mock' || process.env.NODE_ENV === 'test') {
    console.log('[MesaRuntime] InMemoryPool schema initialization skipped.');
    return;
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await getPool().query(sql);
  console.log('[MesaRuntime] Postgres schema initialized.');
}

// ─── Flow Store ───────────────────────────────────────────────────────────────

export interface FlowRecord {
  id: string;
  name: string;
  definition: object;
  created_at: Date;
}

export async function createFlow(id: string, name: string, definition: object): Promise<FlowRecord> {
  const res = await getPool().query(
    `INSERT INTO flows (id, name, definition) VALUES ($1, $2, $3) RETURNING *`,
    [id, name, JSON.stringify(definition)]
  );
  return res.rows[0];
}

export async function getFlow(id: string): Promise<FlowRecord | null> {
  const res = await getPool().query(`SELECT * FROM flows WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

// ─── Execution Store ──────────────────────────────────────────────────────────

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'PERMANENTLY_FAILED';

export interface ExecutionRecord {
  id: string;
  flow_id: string;
  status: ExecutionStatus;
  context: Record<string, unknown>;
  current_step: number;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

export async function createExecution(id: string, flowId: string, context: Record<string, unknown> = {}): Promise<ExecutionRecord> {
  const res = await getPool().query(
    `INSERT INTO executions (id, flow_id, context) VALUES ($1, $2, $3) RETURNING *`,
    [id, flowId, JSON.stringify(context)]
  );
  return res.rows[0];
}

export async function getExecution(id: string): Promise<ExecutionRecord | null> {
  const res = await getPool().query(`SELECT * FROM executions WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function updateExecution(id: string, fields: Partial<Pick<ExecutionRecord, 'status' | 'context' | 'current_step' | 'started_at' | 'completed_at'>>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (fields.status !== undefined)        { sets.push(`status = $${i++}`);        values.push(fields.status); }
  if (fields.context !== undefined)       { sets.push(`context = $${i++}`);       values.push(JSON.stringify(fields.context)); }
  if (fields.current_step !== undefined)  { sets.push(`current_step = $${i++}`);  values.push(fields.current_step); }
  if (fields.started_at !== undefined)    { sets.push(`started_at = $${i++}`);    values.push(fields.started_at); }
  if (fields.completed_at !== undefined)  { sets.push(`completed_at = $${i++}`);  values.push(fields.completed_at); }
  if (sets.length === 0) return;
  values.push(id);
  await getPool().query(`UPDATE executions SET ${sets.join(', ')} WHERE id = $${i}`, values);
}

export async function getPendingExecutions(): Promise<ExecutionRecord[]> {
  const res = await getPool().query(
    `SELECT * FROM executions WHERE status IN ('PENDING', 'RUNNING') ORDER BY created_at ASC LIMIT 50`
  );
  return res.rows;
}

// ─── Step Store ───────────────────────────────────────────────────────────────

export type StepStatus = 'PENDING' | 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface StepRecord {
  id: string;
  execution_id: string;
  step_index: number;
  name: string;
  provider: string;
  status: StepStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  next_retry: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function createStep(data: Omit<StepRecord, 'created_at' | 'updated_at'>): Promise<StepRecord> {
  const res = await getPool().query(
    `INSERT INTO steps (id, execution_id, step_index, name, provider, status, input, output, error, attempts, next_retry)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [data.id, data.execution_id, data.step_index, data.name, data.provider, data.status,
     data.input ? JSON.stringify(data.input) : null,
     data.output ? JSON.stringify(data.output) : null,
     data.error, data.attempts, data.next_retry]
  );
  return res.rows[0];
}

export async function getStep(id: string): Promise<StepRecord | null> {
  const res = await getPool().query(`SELECT * FROM steps WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function getStepForExecution(executionId: string, stepIndex: number): Promise<StepRecord | null> {
  const res = await getPool().query(
    `SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2`,
    [executionId, stepIndex]
  );
  return res.rows[0] ?? null;
}

export async function updateStep(id: string, fields: Partial<Pick<StepRecord, 'status' | 'output' | 'error' | 'attempts' | 'next_retry'>>): Promise<void> {
  const sets: string[] = [`updated_at = NOW()`];
  const values: unknown[] = [];
  let i = 1;
  if (fields.status !== undefined)     { sets.push(`status = $${i++}`);     values.push(fields.status); }
  if (fields.output !== undefined)     { sets.push(`output = $${i++}`);     values.push(fields.output ? JSON.stringify(fields.output) : null); }
  if (fields.error !== undefined)      { sets.push(`error = $${i++}`);      values.push(fields.error); }
  if (fields.attempts !== undefined)   { sets.push(`attempts = $${i++}`);   values.push(fields.attempts); }
  if (fields.next_retry !== undefined) { sets.push(`next_retry = $${i++}`); values.push(fields.next_retry); }
  values.push(id);
  await getPool().query(`UPDATE steps SET ${sets.join(', ')} WHERE id = $${i}`, values);
}

// ─── Event Store ──────────────────────────────────────────────────────────────

export interface EventRecord {
  id: number;
  execution_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  timestamp: Date;
}

export async function appendEvent(executionId: string, type: string, payload?: Record<string, unknown>): Promise<void> {
  await getPool().query(
    `INSERT INTO events (execution_id, type, payload) VALUES ($1, $2, $3)`,
    [executionId, type, payload ? JSON.stringify(payload) : null]
  );
}

export async function getEvents(executionId: string): Promise<EventRecord[]> {
  const res = await getPool().query(
    `SELECT * FROM events WHERE execution_id = $1 ORDER BY timestamp ASC`,
    [executionId]
  );
  return res.rows;
}
