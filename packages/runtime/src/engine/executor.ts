import { randomUUID } from 'crypto';
import { getProvider, ExecutionContext, StepDefinition } from '../provider';
import * as store from '../store';

const MAX_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000;

function retryDelayMs(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
}

/**
 * Execute a single step of a running execution.
 * Handles retry logic, state persistence, and step transitions.
 */
export async function executeStep(
  execution: store.ExecutionRecord,
  stepDef: StepDefinition,
  stepIndex: number
): Promise<void> {
  // Upsert the step record
  let stepRecord = await store.getStepForExecution(execution.id, stepIndex);
  if (!stepRecord) {
    stepRecord = await store.createStep({
      id: randomUUID(),
      execution_id: execution.id,
      step_index: stepIndex,
      name: stepDef.name,
      provider: stepDef.provider,
      status: 'PENDING',
      input: stepDef.params,
      output: null,
      error: null,
      attempts: 0,
      next_retry: null,
    });
  }

  // Skip if already completed
  if (stepRecord.status === 'COMPLETED') return;

  // Skip if suspended (waiting for external event)
  if (stepRecord.status === 'SUSPENDED') return;

  // Skip if scheduled retry is in the future
  if (stepRecord.next_retry && stepRecord.next_retry > new Date()) return;

  // Skip if permanently failed
  if (stepRecord.status === 'FAILED' && stepRecord.attempts >= MAX_ATTEMPTS) return;

  await store.updateStep(stepRecord.id, { status: 'RUNNING', attempts: stepRecord.attempts + 1 });
  await store.appendEvent(execution.id, 'step.started', {
    stepIndex,
    name: stepDef.name,
    provider: stepDef.provider,
    attempt: stepRecord.attempts + 1,
  });

  const context: ExecutionContext = {
    executionId: execution.id,
    flowId: execution.flow_id,
    stepIndex,
    stepId: stepRecord.id,
    shared: execution.context as Record<string, unknown>,
  };

  try {
    const provider = getProvider(stepDef.provider);
    const result = await provider.execute(stepDef, context);

    if (result.outcome === 'completed') {
      // Merge output into shared execution context
      if (result.output) {
        const merged = { ...(execution.context as Record<string, unknown>), ...result.output };
        await store.updateExecution(execution.id, { context: merged });
      }
      await store.updateStep(stepRecord.id, { status: 'COMPLETED', output: result.output ?? {} });
      await store.appendEvent(execution.id, 'step.completed', { stepIndex, name: stepDef.name, output: result.output });
      console.log(`[MesaRuntime] ✔ Step ${stepIndex} (${stepDef.name}) completed.`);

    } else if (result.outcome === 'suspended') {
      await store.updateStep(stepRecord.id, { status: 'SUSPENDED', output: { suspensionKey: result.suspensionKey } });
      await store.appendEvent(execution.id, 'step.suspended', { stepIndex, name: stepDef.name, suspensionKey: result.suspensionKey });
      console.log(`[MesaRuntime] ⏸  Step ${stepIndex} (${stepDef.name}) suspended — waiting for: ${result.suspensionKey}`);

    } else {
      throw new Error(result.error ?? 'Step returned failure without message');
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const newAttempts = (stepRecord.attempts ?? 0) + 1;
    await store.appendEvent(execution.id, 'step.failed', { stepIndex, name: stepDef.name, error: msg, attempt: newAttempts });

    if (newAttempts >= MAX_ATTEMPTS) {
      await store.updateStep(stepRecord.id, { status: 'FAILED', error: msg });
      await store.updateExecution(execution.id, { status: 'PERMANENTLY_FAILED', completed_at: new Date() });
      await store.appendEvent(execution.id, 'flow.failed', { reason: `Step ${stepDef.name} permanently failed after ${newAttempts} attempts.` });
      console.error(`[MesaRuntime] ✗ Step ${stepIndex} (${stepDef.name}) permanently failed: ${msg}`);
    } else {
      const nextRetry = new Date(Date.now() + retryDelayMs(newAttempts));
      await store.updateStep(stepRecord.id, { status: 'RETRYING', error: msg, next_retry: nextRetry });
      console.warn(`[MesaRuntime] ↻ Step ${stepIndex} (${stepDef.name}) will retry at ${nextRetry.toISOString()}`);
    }
  }
}
