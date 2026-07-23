import { FlowDefinition, FlowBuilder } from './flow';

export interface MesaConfig {
  runtimeUrl?: string;
  endpoint?: string;
  apiKey?: string;
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
 * Supports API Key authentication and custom runtime endpoints.
 */
export class MesaClient {
  private runtimeUrl: string;
  private apiKey?: string;

  constructor(config: MesaConfig = {}) {
    this.runtimeUrl = config.runtimeUrl ?? config.endpoint ?? process.env.MESA_RUNTIME_URL ?? DEFAULT_RUNTIME_URL;
    this.apiKey = config.apiKey ?? process.env.MESA_API_KEY;
  }

  flow(name?: string, id?: string): FlowBuilder {
    return new FlowBuilder(name, id, this);
  }

  /**
   * Register a flow definition directly with the runtime.
   */
  async register(flow: FlowDefinition): Promise<{ flowId: string; name: string }> {
    return this._post('/flows', {
      id: flow.id,
      name: flow.name,
      definition: flow,
    });
  }

  /**
   * Register the flow definition, then start an execution.
   */
  async execute(flow: FlowDefinition, context: Record<string, unknown> = {}): Promise<ExecutionResult> {
    // 1. Register flow (idempotent by flow id)
    await this.register(flow);

    // 2. Start execution
    const result = await this._post('/executions', {
      flowId: flow.id,
      context,
    });

    return {
      executionId: result.executionId,
      flowId: flow.id || flow.name,
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['X-Mesa-Api-Key'] = this.apiKey;
    }

    const res = await fetch(`${this.runtimeUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MesaRuntime POST ${path} failed (${res.status}): ${errText}`);
    }

    return res.json();
  }

  private async _get(path: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['X-Mesa-Api-Key'] = this.apiKey;
    }

    const res = await fetch(`${this.runtimeUrl}${path}`, { headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MesaRuntime GET ${path} failed (${res.status}): ${errText}`);
    }
    return res.json();
  }
}
