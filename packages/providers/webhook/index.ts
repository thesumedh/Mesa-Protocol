import { MesaProvider, StepDefinition, ExecutionContext, StepResult, ExternalEvent } from '../../runtime/src/provider';
import * as https from 'https';
import * as http from 'http';

/**
 * WebhookProvider
 *
 * Sends an HTTP POST to a configured URL with the execution payload.
 * Retries are handled by the runtime's retry logic.
 * Supports outbound webhooks (step: notify application) AND
 * inbound webhook resumption (step: wait for external callback).
 */
export class WebhookProvider implements MesaProvider {
  readonly name = 'webhook';

  async execute(step: StepDefinition, context: ExecutionContext): Promise<StepResult> {
    const { url, events, waitForCallback } = step.params as {
      url?: string;
      events?: string[];
      waitForCallback?: boolean;
    };

    // If waitForCallback, suspend and wait for an inbound webhook
    if (waitForCallback) {
      const suspensionKey = `webhook:${context.executionId}:${context.stepIndex}`;
      return { outcome: 'suspended', suspensionKey };
    }

    if (!url) throw new Error('WebhookProvider: url is required');

    const payload = {
      executionId: context.executionId,
      flowId: context.flowId,
      stepIndex: context.stepIndex,
      timestamp: new Date().toISOString(),
      context: context.shared,
    };

    await sendPost(url, payload);
    return { outcome: 'completed', output: { webhookSent: true, url } };
  }

  async resume(event: ExternalEvent, _context: ExecutionContext): Promise<StepResult> {
    return { outcome: 'completed', output: { callbackPayload: event.payload } };
  }
}

function sendPost(url: string, payload: object): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Mesa-Event': 'step.webhook',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error(`Webhook returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
