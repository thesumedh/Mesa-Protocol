import * as store from '../store';
import { executeStep } from './executor';
import { StepDefinition } from '../provider';

const POLL_INTERVAL_MS = 2000; // 2 second polling loop

interface FlowDefinition {
  steps: StepDefinition[];
}

/**
 * The scheduler drives the execution of all PENDING and RUNNING workflows.
 * It polls Postgres, picks up each pending execution, and advances it
 * step by step until all steps are completed (or permanently failed).
 */
export class Scheduler {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log('[MesaRuntime] Scheduler started.');
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    console.log('[MesaRuntime] Scheduler stopped.');
  }

  private tick(): void {
    this.poll()
      .catch(err => console.error('[MesaRuntime] Scheduler poll error:', err))
      .finally(() => {
        if (this.running) {
          this.timer = setTimeout(() => this.tick(), POLL_INTERVAL_MS);
        }
      });
  }

  private async poll(): Promise<void> {
    const executions = await store.getPendingExecutions();
    // Process all pending executions concurrently — no reason to serialise them
    await Promise.all(executions.map(e => this.advance(e).catch(err =>
      console.error(`[MesaRuntime] Scheduler advance error for ${e.id}:`, err)
    )));
  }

  private async advance(execution: store.ExecutionRecord): Promise<void> {
    if (execution.status === 'PERMANENTLY_FAILED') return;

    const flow = await store.getFlow(execution.flow_id);
    if (!flow) {
      console.error(`[MesaRuntime] Flow not found: ${execution.flow_id}`);
      return;
    }

    const definition = flow.definition as FlowDefinition;
    const steps = definition.steps ?? [];

    // Mark execution as RUNNING on first advance
    if (execution.status === 'PENDING') {
      await store.updateExecution(execution.id, { status: 'RUNNING', started_at: new Date() });
      await store.appendEvent(execution.id, 'flow.started', { flowId: execution.flow_id });
    }

    let current = execution.current_step;

    // Advance through steps
    while (current < steps.length) {
      const stepDef = steps[current];
      await executeStep(execution, stepDef, current);

      // Re-fetch step to check its final status
      const stepRecord = await store.getStepForExecution(execution.id, current);
      if (!stepRecord) break;

      if (stepRecord.status === 'COMPLETED') {
        current++;
        // Re-fetch execution to get updated shared context
        const refreshed = await store.getExecution(execution.id);
        if (!refreshed || refreshed.status === 'PERMANENTLY_FAILED') return;
        execution = refreshed;
        await store.updateExecution(execution.id, { current_step: current });
      } else if (stepRecord.status === 'SUSPENDED') {
        // Execution is parked — scheduler will not re-attempt until step.resume() called
        await store.updateExecution(execution.id, { status: 'SUSPENDED' });
        break;
      } else if (stepRecord.status === 'RETRYING') {
        // Retry is scheduled — come back later
        break;
      } else if (stepRecord.status === 'FAILED') {
        // Permanently failed — already handled by executor
        return;
      } else {
        // Still RUNNING or something unexpected — don't loop
        break;
      }
    }

    // Check if all steps completed
    if (current >= steps.length) {
      await store.updateExecution(execution.id, { status: 'COMPLETED', completed_at: new Date() });
      await store.appendEvent(execution.id, 'flow.completed', { steps: steps.length });
      console.log(`[MesaRuntime] 🎉 Execution ${execution.id} completed.`);
    }
  }
}
