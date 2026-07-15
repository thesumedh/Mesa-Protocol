import { MesaProvider, StepDefinition, ExecutionContext, StepResult } from '../../runtime/src/provider';

/**
 * DelayProvider
 *
 * Suspends execution for a given number of seconds.
 * Used in flows that need to wait (e.g. wait for anchor processing).
 * The runtime's scheduler re-attempts after the delay.
 */
export class DelayProvider implements MesaProvider {
  readonly name = 'delay';

  async execute(step: StepDefinition, _context: ExecutionContext): Promise<StepResult> {
    const { seconds } = step.params as { seconds: number };
    if (!seconds || seconds <= 0) {
      return { outcome: 'completed', output: { waited: 0 } };
    }
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return { outcome: 'completed', output: { waited: seconds } };
  }
}
