import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as store from './store';
import { getProvider, ExternalEvent, listProviders } from './provider';

export function createServer(): express.Express {
  const app = express();
  app.use(express.json());

  // ─── Health Check ─────────────────────────────────────────────────────────

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'mesa-runtime', timestamp: new Date().toISOString() });
  });

  // ─── Submit a new flow execution ──────────────────────────────────────────

  app.post('/executions', async (req: Request, res: Response) => {
    try {
      const { flowId, context } = req.body;
      if (!flowId) return res.status(400).json({ error: 'flowId is required' }) as any;

      const flow = await store.getFlow(flowId);
      if (!flow) return res.status(404).json({ error: `Flow not found: ${flowId}` }) as any;

      const execution = await store.createExecution(randomUUID(), flowId, context ?? {});
      await store.appendEvent(execution.id, 'execution.created', { flowId });

      console.log(`[MesaRuntime] New execution created: ${execution.id} for flow: ${flowId}`);
      res.status(201).json({ executionId: execution.id, status: execution.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Register a flow definition ───────────────────────────────────────────

  app.post('/flows', async (req: Request, res: Response) => {
    try {
      const { id, name, definition } = req.body;
      if (!name || !definition) return res.status(400).json({ error: 'name and definition are required' }) as any;

      const flowId = id ?? randomUUID();
      const existingFlow = await store.getFlow(flowId);
      if (existingFlow) {
        console.log(`[MesaRuntime] Flow already registered: ${existingFlow.id} (${existingFlow.name}). Reusing.`);
        return res.status(201).json({ flowId: existingFlow.id, name: existingFlow.name, reused: true });
      }

      const flow = await store.createFlow(flowId, name, definition);

      console.log(`[MesaRuntime] Flow registered: ${flow.id} (${flow.name})`);
      res.status(201).json({ flowId: flow.id, name: flow.name });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Get execution status ─────────────────────────────────────────────────

  app.get('/executions/:id', async (req: Request, res: Response) => {
    try {
      const execution = await store.getExecution(req.params.id);
      if (!execution) return res.status(404).json({ error: 'Execution not found' }) as any;

      const pool = store.getPool();
      const stepsRes = await pool.query(
        `SELECT step_index, status, output, error, attempts, created_at, updated_at
         FROM steps
         WHERE execution_id = $1
         ORDER BY step_index ASC`,
        [execution.id]
      );

      const events = await store.getEvents(req.params.id);
      res.json({
        execution: {
          ...execution,
          steps: stepsRes.rows,
        },
        events
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Webhook receiver — resumes suspended steps ───────────────────────────

  app.post('/webhooks/resume', async (req: Request, res: Response) => {
    try {
      const { suspensionKey, payload } = req.body;
      if (!suspensionKey) return res.status(400).json({ error: 'suspensionKey is required' }) as any;

      // Find the suspended step with this suspension key
      const pool = store.getPool();
      const stepRes = await pool.query(
        `SELECT s.*, e.context as exec_context, e.flow_id, e.id as execution_id_ref
         FROM steps s
         JOIN executions e ON s.execution_id = e.id
         WHERE s.status = 'SUSPENDED'
           AND s.output->>'suspensionKey' = $1
         LIMIT 1`,
        [suspensionKey]
      );

      if (stepRes.rows.length === 0) {
        return res.status(404).json({ error: `No suspended step found for key: ${suspensionKey}` }) as any;
      }

      const step = stepRes.rows[0];
      const execution = await store.getExecution(step.execution_id);
      if (!execution) return res.status(404).json({ error: 'Execution not found' }) as any;

      const event: ExternalEvent = { suspensionKey, payload: payload ?? {} };
      const context = {
        executionId: execution.id,
        flowId: execution.flow_id,
        stepIndex: step.step_index,
        stepId: step.id,
        shared: execution.context as Record<string, unknown>,
      };

      const provider = getProvider(step.provider);
      if (!provider.resume) {
        return res.status(400).json({ error: `Provider ${step.provider} does not support resumption` }) as any;
      }

      const result = await provider.resume(event, context);

      if (result.outcome === 'completed') {
        if (result.output) {
          const merged = { ...(execution.context as Record<string, unknown>), ...result.output };
          await store.updateExecution(execution.id, { context: merged });
        }
        await store.updateStep(step.id, { status: 'COMPLETED', output: result.output ?? {} });
        await store.appendEvent(execution.id, 'step.resumed', { stepIndex: step.step_index, suspensionKey });
        await store.appendEvent(execution.id, 'step.completed', { stepIndex: step.step_index });
        // Reset execution to PENDING so scheduler picks it up and advances
        await store.updateExecution(execution.id, { status: 'PENDING' });
        console.log(`[MesaRuntime] ▶ Step ${step.step_index} resumed via webhook.`);
      } else {
        await store.updateStep(step.id, { status: 'FAILED', error: result.error });
        await store.appendEvent(execution.id, 'step.failed', { stepIndex: step.step_index, error: result.error });
      }

      res.json({ resumed: true, outcome: result.outcome });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── List Executions ───────────────────────────────────────────────────────

  app.get('/executions', async (_req: Request, res: Response) => {
    try {
      const pool = store.getPool();
      const result = await pool.query(
        `SELECT id, flow_id, status, context, created_at
         FROM executions
         ORDER BY created_at DESC`
      );
      
      // Load steps for each execution to populate step list details in UI
      const list = await Promise.all(result.rows.map(async (exec: any) => {
        const stepsRes = await pool.query(
          `SELECT step_index, status, output, error, attempts, created_at, updated_at
           FROM steps
           WHERE execution_id = $1
           ORDER BY step_index ASC`,
          [exec.id]
        );
        return {
          ...exec,
          steps: stepsRes.rows,
        };
      }));

      res.json(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── List Flows ────────────────────────────────────────────────────────────

  app.get('/flows', async (_req: Request, res: Response) => {
    try {
      const pool = store.getPool();
      const result = await pool.query(
        `SELECT id, name, definition, created_at
         FROM flows
         ORDER BY created_at DESC`
      );
      res.json(result.rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── List Providers & health details ───────────────────────────────────────

  app.get('/providers', async (_req: Request, res: Response) => {
    try {
      const names = listProviders();
      const list = await Promise.all(names.map(async name => {
        const p = getProvider(name);
        let health: any = { status: 'healthy' };
        if (p.health) {
          try {
            health = await p.health();
          } catch (e: any) {
             health = { status: 'unhealthy', details: e.message };
          }
        }
        return { name, health };
      }));
      res.json(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Render Dashboard HTML Console ─────────────────────────────────────────

  app.get('/dashboard', (_req: Request, res: Response) => {
    const possiblePaths = [
      path.join(__dirname, 'dashboard.html'),
      path.join(__dirname, 'server', 'dashboard.html'),
      path.join(__dirname, '..', 'src', 'server', 'dashboard.html'),
      path.join(__dirname, '..', '..', 'src', 'server', 'dashboard.html'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).send('Dashboard file not found');
  });

  return app;
}
