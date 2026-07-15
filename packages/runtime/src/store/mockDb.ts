import { Pool } from 'pg';

export class InMemoryPool {
  private flows = new Map<string, any>();
  private executions = new Map<string, any>();
  private steps = new Map<string, any>();
  private events: any[] = [];

  async query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // 1. INSERT INTO flows
    if (cleanText.startsWith('INSERT INTO flows')) {
      const [id, name, definitionJson] = params;
      const flow = { id, name, definition: JSON.parse(definitionJson), created_at: new Date() };
      this.flows.set(id, flow);
      return { rows: [flow] };
    }

    // 2. SELECT * FROM flows WHERE id = $1
    if (cleanText.startsWith('SELECT * FROM flows WHERE id = $1')) {
      const flow = this.flows.get(params[0]);
      return { rows: flow ? [flow] : [] };
    }

    // 3. INSERT INTO executions
    if (cleanText.startsWith('INSERT INTO executions')) {
      const [id, flowId, contextJson] = params;
      const execution = {
        id,
        flow_id: flowId,
        status: 'PENDING',
        context: JSON.parse(contextJson),
        current_step: 0,
        started_at: null,
        completed_at: null,
        created_at: new Date(),
      };
      this.executions.set(id, execution);
      return { rows: [execution] };
    }

    // 4. SELECT * FROM executions WHERE id = $1
    if (cleanText.startsWith('SELECT * FROM executions WHERE id = $1')) {
      const execution = this.executions.get(params[0]);
      return { rows: execution ? [execution] : [] };
    }

    // 5. UPDATE executions SET ... WHERE id = $...
    if (cleanText.startsWith('UPDATE executions SET')) {
      const id = params[params.length - 1];
      const execution = this.executions.get(id);
      if (execution) {
        // Simple manual parsing of SET clauses
        if (cleanText.includes('status =')) {
          execution.status = params[0];
        }
        if (cleanText.includes('context =')) {
          const idx = cleanText.indexOf('context =') > -1 ? (cleanText.includes('status =') ? 1 : 0) : -1;
          if (idx !== -1) execution.context = JSON.parse(params[idx]);
        }
        if (cleanText.includes('current_step =')) {
          const idx = params.indexOf(id) - 1; // current_step is usually just before the ID
          execution.current_step = params[idx];
        }
        if (cleanText.includes('started_at =')) {
          execution.started_at = new Date();
        }
        if (cleanText.includes('completed_at =')) {
          execution.completed_at = new Date();
        }
      }
      return { rows: execution ? [execution] : [] };
    }

    // 6. SELECT * FROM executions WHERE status IN ('PENDING', 'RUNNING')
    if (cleanText.startsWith('SELECT * FROM executions WHERE status IN')) {
      const rows = Array.from(this.executions.values())
        .filter(e => e.status === 'PENDING' || e.status === 'RUNNING')
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      return { rows };
    }

    // 7. INSERT INTO steps
    if (cleanText.startsWith('INSERT INTO steps')) {
      const [id, executionId, stepIndex, name, provider, status, inputJson, outputJson, error, attempts, nextRetry] = params;
      const step = {
        id,
        execution_id: executionId,
        step_index: stepIndex,
        name,
        provider,
        status,
        input: inputJson ? JSON.parse(inputJson) : null,
        output: outputJson ? JSON.parse(outputJson) : null,
        error,
        attempts,
        next_retry: nextRetry,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.steps.set(`${executionId}:${stepIndex}`, step);
      return { rows: [step] };
    }

    // 8. SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2
    if (cleanText.startsWith('SELECT * FROM steps WHERE execution_id = $1 AND step_index = $2')) {
      const step = this.steps.get(`${params[0]}:${params[1]}`);
      return { rows: step ? [step] : [] };
    }

    // 9. UPDATE steps SET
    if (cleanText.startsWith('UPDATE steps SET')) {
      const id = params[params.length - 1];
      // Find step by id
      const step = Array.from(this.steps.values()).find(s => s.id === id);
      if (step) {
        step.updated_at = new Date();
        if (cleanText.includes('status =')) {
          step.status = params[0];
        }
        if (cleanText.includes('output =')) {
          const idx = cleanText.includes('status =') ? 1 : 0;
          step.output = params[idx] ? JSON.parse(params[idx]) : null;
        }
        if (cleanText.includes('error =')) {
          step.error = params[params.indexOf(id) - 1];
        }
        if (cleanText.includes('attempts =')) {
          step.attempts = params[params.indexOf(id) - 1];
        }
      }
      return { rows: step ? [step] : [] };
    }

    // 10. INSERT INTO events
    if (cleanText.startsWith('INSERT INTO events')) {
      const [executionId, type, payloadJson] = params;
      const event = {
        id: this.events.length + 1,
        execution_id: executionId,
        type,
        payload: payloadJson ? JSON.parse(payloadJson) : null,
        timestamp: new Date(),
      };
      this.events.push(event);
      return { rows: [event] };
    }

    // 11. SELECT * FROM events WHERE execution_id = $1
    if (cleanText.startsWith('SELECT * FROM events WHERE execution_id = $1')) {
      const rows = this.events
        .filter(ev => ev.execution_id === params[0])
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return { rows };
    }

    // 12. Join query: SELECT s.*, e.context as exec_context...
    if (cleanText.includes('FROM steps s JOIN executions e')) {
      const key = params[0];
      const rows = Array.from(this.steps.values())
        .filter(s => s.status === 'SUSPENDED' && s.output?.suspensionKey === key)
        .map(s => {
          const exec = this.executions.get(s.execution_id);
          return {
            ...s,
            exec_context: exec ? exec.context : {},
            flow_id: exec ? exec.flow_id : '',
            execution_id_ref: s.execution_id,
          };
        });
      return { rows };
    }

    // 13. SELECT id, flow_id, status, context, created_at, updated_at FROM executions
    if (cleanText.startsWith('SELECT id, flow_id, status, context, created_at, updated_at FROM executions')) {
      const rows = Array.from(this.executions.values())
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows };
    }

    // 14. SELECT step_index, status, output, error, attempts, created_at, updated_at FROM steps WHERE execution_id = $1
    if (cleanText.startsWith('SELECT step_index, status, output, error, attempts, created_at, updated_at FROM steps WHERE execution_id = $1')) {
      const rows = Array.from(this.steps.values())
        .filter(s => s.execution_id === params[0])
        .sort((a, b) => a.step_index - b.step_index);
      return { rows };
    }

    // 15. SELECT id, name, definition, created_at, updated_at FROM flows
    if (cleanText.startsWith('SELECT id, name, definition, created_at, updated_at FROM flows')) {
      const rows = Array.from(this.flows.values())
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return { rows };
    }

    // 16. Generic SELECT steps WHERE execution_id = $1
    if (cleanText.includes('FROM steps WHERE execution_id = $1')) {
      const rows = Array.from(this.steps.values())
        .filter(s => s.execution_id === params[0])
        .sort((a, b) => a.step_index - b.step_index);
      return { rows };
    }

    return { rows: [] };
  }

  // No-op methods to satisfy Pool interface
  async connect(): Promise<any> {
    return {
      query: this.query.bind(this),
      release: () => {},
    };
  }

  async end(): Promise<void> {}
}
