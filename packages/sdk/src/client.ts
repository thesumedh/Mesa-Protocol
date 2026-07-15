import { FlowDefinition } from './flow';

export interface MesaConfig {
  runtimeUrl?: string;
}

export interface ExecutionResult {
  executionId: string;
  flowId: string;
  status: string;
}

const DEFAULT_RUNTIME_URL = 'http://localhost:3001';

/**
 * MesaClient
 *
 * Sends flow definitions and execution requests to the Mesa Runtime.
 * For use in server-side code (Node.js). Browser usage goes through
 * the Mesa Runtime directly (never expose runtime to browser clients).
 */
export class MesaClient {
  private runtimeUrl: string;

  constructor(config: MesaConfig = {}) {
    this.runtimeUrl = config.runtimeUrl ?? process.env.MESA_RUNTIME_URL ?? DEFAULT_RUNTIME_URL;
  }

  /**
   * Register the flow definition, then start an execution.
   */
  async execute(flow: FlowDefinition, context: Record<string, unknown> = {}): Promise<ExecutionResult> {
    // 1. Register flow (idempotent by flow id)
    await this._post('/flows', {
      id: flow.id,
      name: flow.name,
      definition: flow,
    });

    // 2. Start execution
    const result = await this._post('/executions', {
      flowId: flow.id,
      context,
    });

    return {
      executionId: result.executionId,
      flowId: flow.id,
      status: result.status,
    };
  }

  /**
   * Get status and event log for an execution.
   */
  async status(executionId: string): Promise<{ execution: unknown; events: unknown[] }> {
    return this._get(`/executions/${executionId}`);
  }

  private async _post(path: string, body: object): Promise<any> {
    const res = await fetch(`${this.runtimeUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mesa Runtime error (${res.status}): ${text}`);
    }
    return res.json();
  }

  private async _get(path: string): Promise<any> {
    const res = await fetch(`${this.runtimeUrl}${path}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mesa Runtime error (${res.status}): ${text}`);
    }
    return res.json();
  }
}
