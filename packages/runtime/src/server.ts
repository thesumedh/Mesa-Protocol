import express, { Request, Response, NextFunction } from 'express';
import { randomUUID, createHmac } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as store from './store';
import { getProvider, ExternalEvent, listProviders, ExecutionContext, getProviderMetadata } from './provider';
import { 
  RegisterFlowPayloadSchema, 
  CreateExecutionPayloadSchema, 
  WebhookResumePayloadSchema 
} from '@mesaprotocol/schema';

export function createServer(): express.Express {
  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // Serve UI directory as static files
  const uiPath = path.join(process.cwd(), 'UI');
  if (fs.existsSync(uiPath)) {
    app.use('/UI', express.static(uiPath));
  }

  // ─── API Key Middleware ───────────────────────────────────────────────────

  const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requiredApiKey = process.env.MESA_API_KEY;
    if (!requiredApiKey) {
      return next(); // API Key authentication disabled if not configured
    }
    const clientKey = req.headers['x-mesa-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (clientKey !== requiredApiKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Mesa-Api-Key' });
    }
    next();
  };

  // ─── Health Check ─────────────────────────────────────────────────────────

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'mesa-runtime', timestamp: new Date().toISOString() });
  });

  // ─── Submit a new flow execution ──────────────────────────────────────────

  app.post('/executions', apiKeyMiddleware, async (req: Request, res: Response) => {
    try {
      const parseResult = CreateExecutionPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request body', details: parseResult.error.format() }) as any;
      }

      const { flowId, context, idempotencyKey } = parseResult.data;

      // Idempotency Key check
      if (idempotencyKey) {
        const pool = store.getPool();
        const existingKeyRes = await pool.query(
          `SELECT execution_id FROM idempotency_keys WHERE key = $1 LIMIT 1`,
          [idempotencyKey]
        );
        if (existingKeyRes && existingKeyRes.rows && existingKeyRes.rows.length > 0) {
          const existingExecId = existingKeyRes.rows[0].execution_id;
          const existingExec = await store.getExecution(existingExecId);
          console.log(`[MesaRuntime] Idempotent request re-using execution: ${existingExecId}`);
          return res.status(200).json({ executionId: existingExecId, status: existingExec?.status, idempotent: true });
        }
      }

      const flow = await store.getFlow(flowId);
      if (!flow) return res.status(404).json({ error: `Flow not found: ${flowId}` }) as any;

      const executionId = randomUUID();
      const execution = await store.createExecution(executionId, flowId, context ?? {});
      await store.appendEvent(execution.id, 'execution.created', { flowId });

      if (idempotencyKey) {
        const pool = store.getPool();
        await pool.query(
          `INSERT INTO idempotency_keys (key, execution_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [idempotencyKey, executionId]
        );
      }

      console.log(`[MesaRuntime] New execution created: ${execution.id} for flow: ${flowId}`);
      res.status(201).json({ executionId: execution.id, status: execution.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Register a flow definition ───────────────────────────────────────────

  app.post('/flows', apiKeyMiddleware, async (req: Request, res: Response) => {
    try {
      const parseResult = RegisterFlowPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid flow payload', details: parseResult.error.format() }) as any;
      }

      const { id, name, definition } = parseResult.data;

      const flowId = id ?? definition.id ?? randomUUID();
      const existingFlow = await store.getFlow(flowId);
      if (existingFlow) {
        console.log(`[MesaRuntime] Flow already registered: ${existingFlow.id} (${existingFlow.name}). Reusing.`);
        return res.status(200).json({ flowId: existingFlow.id, name: existingFlow.name, reused: true });
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

  app.get('/executions/:id', apiKeyMiddleware, async (req: Request, res: Response) => {
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

  // ─── Cancel Execution ──────────────────────────────────────────────────────

  app.post('/executions/:id/cancel', apiKeyMiddleware, async (req: Request, res: Response) => {
    try {
      const execution = await store.getExecution(req.params.id);
      if (!execution) return res.status(404).json({ error: 'Execution not found' }) as any;

      if (execution.status === 'COMPLETED' || execution.status === 'FAILED' || execution.status === 'PERMANENTLY_FAILED') {
        return res.status(400).json({ error: `Cannot cancel execution in terminal status: ${execution.status}` }) as any;
      }

      const updated = await store.updateExecution(req.params.id, { status: 'CANCELLED' });
      await store.appendEvent(req.params.id, 'execution.cancelled', { reason: 'User requested cancellation' });
      console.log(`[MesaRuntime] Execution cancelled: ${req.params.id}`);
      res.json({ executionId: updated.id, status: updated.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Webhook Resume Handler ───────────────────────────────────────────────

  app.post('/webhooks/resume', async (req: Request, res: Response) => {
    try {
      const parseResult = WebhookResumePayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid webhook payload', details: parseResult.error.format() }) as any;
      }

      const { suspensionKey, payload } = parseResult.data;

      // Extract Webhook Security Headers
      const signatureHeader = (req.headers['x-mesa-signature'] as string) || parseResult.data.signature;
      const timestampHeader = (req.headers['x-mesa-timestamp'] as string) || parseResult.data.timestamp;
      const eventIdHeader = (req.headers['x-mesa-event-id'] as string) || parseResult.data.eventId;

      const secret = process.env.WEBHOOK_HMAC_SECRET;
      
      if (secret) {
        if (!signatureHeader) {
          return res.status(401).json({ error: 'Missing X-Mesa-Signature header' }) as any;
        }

        // Verify timestamp drift (max 5 minutes tolerance)
        if (timestampHeader) {
          const ts = Number(timestampHeader);
          if (!isNaN(ts)) {
            const now = Date.now();
            if (Math.abs(now - ts) > 5 * 60 * 1000) {
              return res.status(401).json({ error: 'Webhook timestamp expired or drifted beyond 5 minutes' }) as any;
            }
          }
        }

        const rawBody = (req as any).rawBody || JSON.stringify(req.body);
        const signedContent = timestampHeader ? `${timestampHeader}.${rawBody}` : JSON.stringify(payload ?? {});
        
        const expectedSignature = createHmac('sha256', secret)
          .update(signedContent)
          .digest('hex');

        if (signatureHeader !== expectedSignature && signatureHeader !== createHmac('sha256', secret).update(JSON.stringify(payload ?? {})).digest('hex')) {
          return res.status(401).json({ error: 'Invalid HMAC signature' }) as any;
        }
      } else {
        // Fallback to API Key check if HMAC secret is not configured
        const requiredApiKey = process.env.MESA_API_KEY;
        if (requiredApiKey) {
          const clientKey = req.headers['x-mesa-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
          if (clientKey !== requiredApiKey) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Mesa-Api-Key' }) as any;
          }
        }
      }

      // Replay Protection Check via Event ID
      const pool = store.getPool();
      const eventId = eventIdHeader || randomUUID();
      
      const replayCheck = await pool.query(
        `SELECT id FROM webhook_events WHERE id = $1 LIMIT 1`,
        [eventId]
      );
      if (replayCheck && replayCheck.rows && replayCheck.rows.length > 0) {
        console.log(`[MesaRuntime] Duplicate webhook event rejected: ${eventId}`);
        return res.status(409).json({ error: `Replay attack detected: duplicate webhook event id ${eventId}` }) as any;
      }

      // Log webhook audit event
      await pool.query(
        `INSERT INTO webhook_events (id, suspension_key, payload, signature, verified)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, suspensionKey, JSON.stringify(payload ?? {}), signatureHeader ?? null, !!secret]
      );

      const parts = suspensionKey.split(':');
      if (parts.length < 2) return res.status(400).json({ error: 'Invalid suspension key format' }) as any;

      let providerName = parts[0];
      const allProviders = listProviders();
      if (!allProviders.includes(providerName) && parts.length >= 2) {
        const composite = `${parts[0]}-${parts[1]}`;
        if (allProviders.includes(composite)) {
          providerName = composite;
        }
      }

      const provider = getProvider(providerName);
      if (!provider) return res.status(404).json({ error: `Provider not found: ${providerName}` }) as any;
      if (!provider.resume) return res.status(400).json({ error: `Provider ${providerName} does not support resume()` }) as any;

      const step = await pool.query(
        `SELECT s.id, s.execution_id, s.step_index
         FROM steps s
         JOIN executions e ON s.execution_id = e.id
         WHERE s.status = 'SUSPENDED' AND s.output->>'suspensionKey' = $1
         LIMIT 1`,
        [suspensionKey]
      );

      if (!step.rows || step.rows.length === 0) {
        return res.status(404).json({ error: `No suspended step found for key: ${suspensionKey}` }) as any;
      }

      const { execution_id, step_index } = step.rows[0];
      const exec = await store.getExecution(execution_id);

      const execContext: ExecutionContext = {
        executionId: execution_id,
        flowId: exec?.flow_id ?? '',
        stepIndex: step_index,
        stepId: step.rows[0].id,
        shared: exec?.context ?? {},
      };

      const event: ExternalEvent = {
        suspensionKey,
        payload: payload ?? {},
      };

      const outcome = await provider.resume(event, execContext);

      if (outcome.outcome === 'completed') {
        await store.updateStep(step.rows[0].id, {
          status: 'COMPLETED',
          output: outcome.output ?? {}
        });
        await store.updateExecution(execution_id, { status: 'RUNNING' });
        await store.appendEvent(execution_id, 'step.resumed', { stepIndex: step_index, suspensionKey });
        await store.appendEvent(execution_id, 'step.completed', { stepIndex: step_index });
      }

      res.json({ resumed: true, outcome: outcome.outcome });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── List executions ──────────────────────────────────────────────────────

  app.get('/executions', apiKeyMiddleware, async (_req: Request, res: Response) => {
    try {
      const pool = store.getPool();
      const result = await pool.query(
        `SELECT id, flow_id, status, current_step, started_at, completed_at, created_at
         FROM executions
         ORDER BY created_at DESC
         LIMIT 50`
      );
      res.json(result?.rows || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── List flows ────────────────────────────────────────────────────────────

  app.get('/flows', apiKeyMiddleware, async (_req: Request, res: Response) => {
    try {
      const pool = store.getPool();
      const result = await pool.query(
        `SELECT id, name, definition, created_at
         FROM flows
         ORDER BY created_at DESC`
      );
      res.json(result?.rows || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── List Providers & health details ───────────────────────────────────────

  app.get('/providers', apiKeyMiddleware, async (_req: Request, res: Response) => {
    try {
      const names = listProviders();
      const list = await Promise.all(names.map(async name => {
        const p = getProvider(name);
        const metadata = getProviderMetadata(name);
        let health: any = { status: 'healthy' };
        if (p.health) {
          try {
            health = await p.health();
          } catch (e: any) {
             health = { status: 'unhealthy', details: e.message };
          }
        }
        return { name, metadata, health };
      }));
      res.json(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  // ─── Direct Route Aliases for Studio & Docs ─────────────────────────────

  const serveFileIfExists = (res: Response, filePaths: string[]) => {
    for (const p of filePaths) {
      if (fs.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).send('File not found');
  };

  app.get(['/studio', '/studio.html'], (_req: Request, res: Response) => {
    serveFileIfExists(res, [
      path.join(process.cwd(), 'UI', 'studio.html'),
      path.join(__dirname, '..', '..', 'UI', 'studio.html'),
    ]);
  });

  app.get(['/docs', '/docs.html'], (_req: Request, res: Response) => {
    serveFileIfExists(res, [
      path.join(process.cwd(), 'UI', 'docs.html'),
      path.join(__dirname, '..', '..', 'UI', 'docs.html'),
    ]);
  });

  // ─── Render Dashboard HTML Console ─────────────────────────────────────────

  app.get('/dashboard', (_req: Request, res: Response) => {
    serveFileIfExists(res, [
      path.join(__dirname, 'dashboard.html'),
      path.join(__dirname, 'server', 'dashboard.html'),
      path.join(__dirname, '..', 'src', 'server', 'dashboard.html'),
      path.join(__dirname, '..', '..', 'src', 'server', 'dashboard.html'),
    ]);
  });

  return app;
}
