/**
 * InMemoryPool
 *
 * A typed in-memory database adapter that implements the same query interface
 * as pg.Pool, used when DATABASE_URL=mock or NODE_ENV=test.
 *
 * Replaces the previous fragile string-matching implementation. All queries are
 * matched by intent (INSERT, SELECT, UPDATE) using a SET-clause parser that
 * extracts column->parameter-index mappings from the SQL text, rather than
 * assuming fixed parameter positions.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(value: string | null): T | null {
  if (value === null || value === undefined) return null;
  try { return JSON.parse(value); } catch { return null; }
}

/**
 * Parses the SET clause of an UPDATE statement and returns a map of
 * column name -> zero-indexed parameter position.
 *
 * Example: "UPDATE foo SET status = $1, context = $2 WHERE id = $3"
 * Returns: { status: 0, context: 1 }
 */
function parseSetClause(sql: string): Map<string, number> {
  const map = new Map<string, number>();
  const pattern = /(\w+)\s*=\s*\$(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const col = match[1];
    const idx = parseInt(match[2], 10) - 1; // convert to 0-based
    if (col !== 'id') { // skip the WHERE id clause
      map.set(col, idx);
    }
  }
  return map;
}

// ─── In-Memory Pool ───────────────────────────────────────────────────────────

export class InMemoryPool {
  private flows   = new Map<string, FlowRow>();
  private executions = new Map<string, ExecutionRow>();
  private steps   = new Map<string, StepRow>();   // key: `${executionId}:${stepIndex}`
  private stepById = new Map<string, StepRow>();  // key: step.id
  private events: EventRow[] = [];

  async query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
    const sql = text.replace(/\s+/g, ' ').trim();

    // ─── flows ────────────────────────────────────────────────────────────────

    if (sql.startsWith('INSERT INTO flows')) {
      const [id, name, definitionJson] = params;
      const row: FlowRow = {
        id,
        name,
        definition: parseJson<object>(definitionJson) ?? {},
        created_at: new Date(),
      };
      this.flows.set(id, row);
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT * FROM flows WHERE id = $1')) {
      const row = this.flows.get(params[0]);
      return { rows: row ? [row] : [] };
    }

    if (sql.includes('FROM flows') && sql.includes('ORDER BY created_at')) {
      const rows = Array.from(this.flows.values())
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows };
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

    if (sql.startsWith('SELECT * FROM executions WHERE status IN')) {
      const rows = Array.from(this.executions.values())
        .filter(e => e.status === 'PENDING' || e.status === 'RUNNING')
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      return { rows };
    }

    if (sql.startsWith('UPDATE executions SET')) {
      const id = params[params.length - 1];
      const row = this.executions.get(id);
      if (row) {
        const colMap = parseSetClause(sql);
        if (colMap.has('status'))       row.status       = params[colMap.get('status')!];
        if (colMap.has('context'))      row.context      = parseJson(params[colMap.get('context')!]) ?? row.context;
        if (colMap.has('current_step')) row.current_step = params[colMap.get('current_step')!];
        if (colMap.has('started_at'))   row.started_at   = params[colMap.get('started_at')!] ?? new Date();
        if (colMap.has('completed_at')) row.completed_at = params[colMap.get('completed_at')!] ?? new Date();
      }
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT id, flow_id, status, context, created_at FROM executions') ||
        sql.startsWith('SELECT id, flow_id, status, context, created_at, updated_at FROM executions')) {
      const rows = Array.from(this.executions.values())
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows };
    }

    // ─── steps ────────────────────────────────────────────────────────────────

    if (sql.startsWith('INSERT INTO steps')) {
      const [id, executionId, stepIndex, name, provider, status, inputJson, outputJson, error, attempts, nextRetry] = params;
      const row: StepRow = {
        id,
        execution_id: executionId,
        step_index: stepIndex,
        name,
        provider,
        status,
        input:  parseJson(inputJson),
        output: parseJson(outputJson),
        error,
        attempts,
        next_retry: nextRetry,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.steps.set(`${executionId}:${stepIndex}`, row);
      this.stepById.set(id, row);
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2')) {
      const row = this.steps.get(`${params[0]}:${params[1]}`);
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('UPDATE steps SET')) {
      const id = params[params.length - 1];
      const row = this.stepById.get(id);
      if (row) {
        row.updated_at = new Date();
        const colMap = parseSetClause(sql);
        if (colMap.has('status'))     row.status     = params[colMap.get('status')!];
        if (colMap.has('output'))     row.output     = parseJson(params[colMap.get('output')!]);
        if (colMap.has('error'))      row.error      = params[colMap.get('error')!];
        if (colMap.has('attempts'))   row.attempts   = params[colMap.get('attempts')!];
        if (colMap.has('next_retry')) row.next_retry = params[colMap.get('next_retry')!];
      }
      return { rows: row ? [row] : [] };
    }

    if (sql.startsWith('SELECT step_index, status, output, error, attempts, created_at, updated_at FROM steps WHERE execution_id = $1') ||
        sql.includes('FROM steps WHERE execution_id = $1 ORDER BY step_index')) {
      const rows = Array.from(this.steps.values())
        .filter(s => s.execution_id === params[0])
        .sort((a, b) => a.step_index - b.step_index);
      return { rows };
    }

    // Join query: used by POST /webhooks/resume to find suspended steps by key
    if (sql.includes('FROM steps s JOIN executions e')) {
      const key = params[0];
      const rows = Array.from(this.steps.values())
        .filter(s => s.status === 'SUSPENDED' && (s.output as any)?.suspensionKey === key)
        .map(s => {
          const exec = this.executions.get(s.execution_id);
          return {
            ...s,
            exec_context:      exec?.context ?? {},
            flow_id:           exec?.flow_id ?? '',
            execution_id_ref:  s.execution_id,
          };
        });
      return { rows };
    }

    // Generic steps-by-execution fallback
    if (sql.includes('FROM steps') && sql.includes('execution_id = $1')) {
      const rows = Array.from(this.steps.values())
        .filter(s => s.execution_id === params[0])
        .sort((a, b) => a.step_index - b.step_index);
      return { rows };
    }

    // ─── events ───────────────────────────────────────────────────────────────

    if (sql.startsWith('INSERT INTO events')) {
      const [executionId, type, payloadJson] = params;
      const row: EventRow = {
        id:           this.events.length + 1,
        execution_id: executionId,
        type,
        payload:      parseJson(payloadJson),
        timestamp:    new Date(),
      };
      this.events.push(row);
      return { rows: [row] };
    }

    if (sql.startsWith('SELECT * FROM events WHERE execution_id = $1')) {
      const rows = this.events
        .filter(ev => ev.execution_id === params[0])
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return { rows };
    }

    // Unmatched query — log a warning to make failures visible rather than silent
    console.warn(`[InMemoryPool] Unhandled query: ${sql.substring(0, 80)}...`);
    return { rows: [] };
  }

  // No-op methods to satisfy pg Pool interface
  async connect(): Promise<any> {
    return {
      query:   this.query.bind(this),
      release: () => {},
    };
  }

  async end(): Promise<void> {}
}
