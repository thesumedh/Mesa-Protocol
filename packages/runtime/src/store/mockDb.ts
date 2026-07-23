/**
 * InMemoryPool
 *
 * A typed in-memory database adapter that implements the same query interface
 * as pg.Pool, used when DATABASE_URL=mock or NODE_ENV=test.
 */

interface FlowRow {
  id: string;
  name: string;
  definition: object;
  created_at: Date;
}

interface ExecutionRow {
  id: string;
  flow_id: string;
  status: string;
  context: Record<string, unknown>;
  current_step: number;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

interface StepRow {
  id: string;
  execution_id: string;
  step_index: number;
  name: string;
  provider: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  next_retry: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface EventRow {
  id: number;
  execution_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  timestamp: Date;
}

function parseJson<T>(value: string | null): T | null {
  if (value === null || value === undefined) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function parseSetClause(sql: string): Map<string, number> {
  const map = new Map<string, number>();
  const pattern = /(\w+)\s*=\s*\$(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const col = match[1];
    const idx = parseInt(match[2], 10) - 1;
    if (col !== 'id') {
      map.set(col, idx);
    }
  }
  return map;
}

export class InMemoryPool {
  private flows   = new Map<string, FlowRow>();
  private executions = new Map<string, ExecutionRow>();
  private steps  = new Map<string, StepRow>();
  private stepById = new Map<string, StepRow>();
  private events: EventRow[] = [];
  private idempotencyKeys = new Map<string, string>();
  private webhookEvents = new Map<string, any>();

  constructor() {
    console.log('[MesaRuntime] Initializing InMemoryPool for testing/mocking.');
  }

  async query(sqlText: string, params: any[] = []): Promise<{ rows: any[] }> {
    const sql = sqlText.trim().replace(/\s+/g, ' ');

    // ─── flows ────────────────────────────────────────────────────────────────

    if (sql.startsWith('INSERT INTO flows')) {
      const [id, name, defJson] = params;
      const row: FlowRow = {
        id,
        name,
        definition: typeof defJson === 'string' ? JSON.parse(defJson) : defJson,
        created_at: new Date(),
      };
      this.flows.set(id, row);
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT * FROM flows WHERE id = $1')) {
      const row = this.flows.get(params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT id, name, definition, created_at FROM flows')) {
      const rows = Array.from(this.flows.values()).sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime()
      );
      return { rows };
    }

    // ─── idempotency_keys ─────────────────────────────────────────────────────

    if (sql.startsWith('SELECT execution_id FROM idempotency_keys')) {
      const key = params[0];
      const execId = this.idempotencyKeys.get(key);
      return { rows: execId ? [{ execution_id: execId }] : [] };
    }

    if (sql.startsWith('INSERT INTO idempotency_keys')) {
      const [key, execId] = params;
      if (!this.idempotencyKeys.has(key)) {
        this.idempotencyKeys.set(key, execId);
      }
      return { rows: [] };
    }

    // ─── executions ───────────────────────────────────────────────────────────

    if (sql.startsWith('INSERT INTO executions')) {
      const [id, flowId, contextJson] = params;
      const row: ExecutionRow = {
        id,
        flow_id: flowId,
        status: 'PENDING',
        context: parseJson<Record<string, unknown>>(contextJson) ?? {},
        current_step: 0,
        started_at: null,
        completed_at: null,
        created_at: new Date(),
      };
      this.executions.set(id, row);
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT * FROM executions WHERE id = $1')) {
      const row = this.executions.get(params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT id, flow_id, status, current_step, started_at, completed_at, created_at FROM executions')) {
      const rows = Array.from(this.executions.values()).sort(
        (a, b) => b.created_at.getTime() - a.created_at.getTime()
      );
      return { rows };
    }

    if (sql.includes('SELECT * FROM executions WHERE status IN') || sql.includes("status = 'PENDING'")) {
      const rows = Array.from(this.executions.values()).filter(
        e => e.status === 'PENDING' || e.status === 'RUNNING'
      );
      return { rows };
    }

    if (sql.startsWith('UPDATE executions SET')) {
      const idIdx = params.length - 1;
      const id = params[idIdx];
      const row = this.executions.get(id);
      if (!row) return { rows: [] };

      const setMap = parseSetClause(sql);

      if (setMap.has('status')) {
        const newStatus = params[setMap.get('status')!];
        row.status = newStatus;
        if (newStatus === 'RUNNING' && !row.started_at) row.started_at = new Date();
        if ((newStatus === 'COMPLETED' || newStatus === 'FAILED' || newStatus === 'CANCELLED') && !row.completed_at) row.completed_at = new Date();
      }
      if (setMap.has('context')) {
        row.context = parseJson<Record<string, unknown>>(params[setMap.get('context')!]) ?? row.context;
      }
      if (setMap.has('current_step')) {
        row.current_step = params[setMap.get('current_step')!];
      }

      this.executions.set(id, row);
      return { rows: [row] };
    }

    // ─── steps ────────────────────────────────────────────────────────────────

    if (sql.startsWith('INSERT INTO steps')) {
      const [id, executionId, stepIndex, name, provider, status, inputJson, outputJson, error, attempts, nextRetry] = params;
      const row: StepRow = {
        id,
        execution_id: executionId,
        step_index: Number(stepIndex),
        name,
        provider,
        status: status || 'PENDING',
        input: parseJson<Record<string, unknown>>(inputJson),
        output: parseJson<Record<string, unknown>>(outputJson),
        error: error ?? null,
        attempts: attempts ? Number(attempts) : 0,
        next_retry: nextRetry ? new Date(nextRetry) : null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.steps.set(`${executionId}:${stepIndex}`, row);
      this.stepById.set(id, row);
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2')) {
      const [executionId, stepIndex] = params;
      const row = this.steps.get(`${executionId}:${stepIndex}`);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('FROM steps s JOIN executions e') || sql.includes("WHERE s.status = 'SUSPENDED'")) {
      const key = params[0];
      const match = Array.from(this.steps.values()).find(s =>
        s.status === 'SUSPENDED' && s.output && (s.output as any).suspensionKey === key
      );
      if (!match) return { rows: [] };
      const exec = this.executions.get(match.execution_id);
      return {
        rows: [{
          ...match,
          exec_context: exec?.context ?? {},
          flow_id: exec?.flow_id ?? '',
          execution_id_ref: exec?.id ?? '',
        }]
      };
    }

    if (sql.includes('FROM steps') && sql.includes('WHERE execution_id = $1')) {
      const executionId = params[0];
      const rows = Array.from(this.steps.values())
        .filter(s => s.execution_id === executionId)
        .sort((a, b) => a.step_index - b.step_index);
      return { rows };
    }

    if (sql.startsWith('UPDATE steps SET')) {
      const idIdx = params.length - 1;
      const id = params[idIdx];
      const row = this.stepById.get(id);
      if (!row) return { rows: [] };

      const setMap = parseSetClause(sql);
      if (setMap.has('status')) row.status = params[setMap.get('status')!];
      if (setMap.has('output')) row.output = parseJson<Record<string, unknown>>(params[setMap.get('output')!]) ?? row.output;
      if (setMap.has('error')) row.error = params[setMap.get('error')!];
      if (setMap.has('attempts')) row.attempts = params[setMap.get('attempts')!];
      if (setMap.has('next_retry')) row.next_retry = params[setMap.get('next_retry')!] ? new Date(params[setMap.get('next_retry')!]) : null;
      row.updated_at = new Date();

      this.stepById.set(id, row);
      this.steps.set(`${row.execution_id}:${row.step_index}`, row);
      return { rows: [row] };
    }

    // ─── events & webhook_events ──────────────────────────────────────────────

    if (sql.includes('FROM webhook_events WHERE id = $1')) {
      const id = params[0];
      const match = this.webhookEvents.get(id);
      return { rows: match ? [match] : [] };
    }

    if (sql.startsWith('INSERT INTO webhook_events')) {
      const [id, suspensionKey, payload, signature, verified] = params;
      const row = { id, suspension_key: suspensionKey, payload, signature, verified, created_at: new Date() };
      this.webhookEvents.set(id, row);
      return { rows: [row] };
    }

    if (sql.startsWith('INSERT INTO events')) {
      const [executionId, type, payloadJson] = params;
      const row: EventRow = {
        id: this.events.length + 1,
        execution_id: executionId,
        type,
        payload: parseJson<Record<string, unknown>>(payloadJson),
        timestamp: new Date(),
      };
      this.events.push(row);
      return { rows: [row] };
    }

    if (sql.includes('FROM events WHERE execution_id = $1')) {
      const executionId = params[0];
      const rows = this.events
        .filter(e => e.execution_id === executionId)
        .sort((a, b) => a.id - b.id);
      return { rows };
    }

    console.warn('[InMemoryPool] Unhandled query:', sql);
    return { rows: [] };
  }

  async connect(): Promise<this> {
    return this;
  }

  release(): void {}

  async end(): Promise<void> {}
}
