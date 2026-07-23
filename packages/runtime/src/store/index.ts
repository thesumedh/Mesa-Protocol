import { Pool } from 'pg';
import { InMemoryPool } from './mockDb';
import * as fs from 'fs';
import * as path from 'path';

let pool: any = null;
let isUsingInMemory = false;

export function getPool(): any {
  if (!pool) {
    if (process.env.DATABASE_URL === 'mock' || process.env.NODE_ENV === 'test' || isUsingInMemory) {
      console.log('[MesaRuntime] Initializing InMemoryPool for testing/mocking.');
      isUsingInMemory = true;
      pool = new InMemoryPool();
    } else {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://mesa:mesa@localhost:5432/mesa',
        connectionTimeoutMillis: 3000,
      });
    }
  }
  return pool;
}

export async function initSchema(): Promise<void> {
  if (process.env.DATABASE_URL === 'mock' || process.env.NODE_ENV === 'test' || isUsingInMemory) {
    console.log('[MesaRuntime] InMemoryPool schema initialization skipped.');
    return;
  }
  
  const possiblePaths = [
    path.join(__dirname, 'schema.sql'),
    path.join(__dirname, 'store', 'schema.sql'),
    path.join(__dirname, '..', 'src', 'store', 'schema.sql'),
    path.join(process.cwd(), 'schema.sql'),
    path.join(process.cwd(), 'src', 'store', 'schema.sql'),
    path.join(process.cwd(), 'dist', 'store', 'schema.sql'),
  ];

  let schemaPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      schemaPath = p;
      break;
    }
  }

  if (!schemaPath) {
    throw new Error(`[MesaRuntime] Could not locate schema.sql in any of the expected paths: ${JSON.stringify(possiblePaths)}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await getPool().query(sql);
    console.log('[MesaRuntime] Postgres schema initialized.');
  } catch (err: any) {
    console.log('[MesaRuntime] ⚠️ Local PostgreSQL connection failed (5432). Falling back to InMemoryPool for dev runtime.');
    isUsingInMemory = true;
    pool = new InMemoryPool();
  }
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

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' | 'PERMANENTLY_FAILED' | 'CANCELLED';

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

export async function getPendingExecutions(): Promise<ExecutionRecord[]> {
  const res = await getPool().query(
    `SELECT * FROM executions WHERE status = 'PENDING' ORDER BY created_at ASC`
  );
  return res.rows || [];
}

export async function updateExecution(id: string, updates: Partial<ExecutionRecord>): Promise<ExecutionRecord> {
  const setClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(updates.status);
    if (updates.status === 'RUNNING' && !updates.started_at) {
      setClauses.push(`started_at = NOW()`);
    } else if ((updates.status === 'COMPLETED' || updates.status === 'FAILED' || updates.status === 'CANCELLED') && !updates.completed_at) {
      setClauses.push(`completed_at = NOW()`);
    }
  }

  if (updates.context !== undefined) {
    setClauses.push(`context = $${paramIndex++}`);
    params.push(JSON.stringify(updates.context));
  }

  if (updates.current_step !== undefined) {
    setClauses.push(`current_step = $${paramIndex++}`);
    params.push(updates.current_step);
  }

  if (setClauses.length === 0) {
    const existing = await getExecution(id);
    if (!existing) throw new Error(`Execution not found: ${id}`);
    return existing;
  }

  params.push(id);
  const sql = `UPDATE executions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const res = await getPool().query(sql, params);
  return res.rows[0];
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

export async function createStep(params: {
  id: string;
  execution_id: string;
  step_index: number;
  name: string;
  provider: string;
  status?: StepStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  attempts?: number;
  next_retry?: Date | null;
}): Promise<StepRecord> {
  const status = params.status || 'PENDING';
  const attempts = params.attempts || 0;
  const res = await getPool().query(
    `INSERT INTO steps (id, execution_id, step_index, name, provider, status, input, output, error, attempts, next_retry)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      params.id,
      params.execution_id,
      params.step_index,
      params.name,
      params.provider,
      status,
      params.input ? JSON.stringify(params.input) : null,
      params.output ? JSON.stringify(params.output) : null,
      params.error || null,
      attempts,
      params.next_retry || null,
    ]
  );
  return res.rows[0];
}

export async function getStep(executionId: string, stepIndex: number): Promise<StepRecord | null> {
  const res = await getPool().query(
    `SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2`,
    [executionId, stepIndex]
  );
  return res.rows[0] ?? null;
}

export const getStepForExecution = getStep;

export async function updateStep(id: string, updates: Partial<StepRecord>): Promise<StepRecord> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(updates.status);
  }

  if (updates.output !== undefined) {
    setClauses.push(`output = $${paramIndex++}`);
    params.push(JSON.stringify(updates.output));
  }

  if (updates.error !== undefined) {
    setClauses.push(`error = $${paramIndex++}`);
    params.push(updates.error);
  }

  if (updates.attempts !== undefined) {
    setClauses.push(`attempts = $${paramIndex++}`);
    params.push(updates.attempts);
  }

  if (updates.next_retry !== undefined) {
    setClauses.push(`next_retry = $${paramIndex++}`);
    params.push(updates.next_retry);
  }

  params.push(id);
  const sql = `UPDATE steps SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const res = await getPool().query(sql, params);
  return res.rows[0];
}

// ─── Event Store ──────────────────────────────────────────────────────────────

export interface EventRecord {
  id: number;
  execution_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  timestamp: Date;
}

export async function appendEvent(
  executionId: string,
  type: string,
  payload: Record<string, unknown> = {}
): Promise<EventRecord> {
  const res = await getPool().query(
    `INSERT INTO events (execution_id, type, payload) VALUES ($1, $2, $3) RETURNING *`,
    [executionId, type, JSON.stringify(payload)]
  );
  return res.rows[0];
}

export async function getEvents(executionId: string): Promise<EventRecord[]> {
  const res = await getPool().query(
    `SELECT * FROM events WHERE execution_id = $1 ORDER BY id ASC`,
    [executionId]
  );
  return res.rows;
}
