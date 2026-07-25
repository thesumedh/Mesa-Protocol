import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.SENDER_SECRET) {
  process.env.SENDER_SECRET = 'SDUMMYMOCKSECRETKEYFORSTALLERDEVWORKFLOWS12345';
}

import { initSchema, getPool } from './store';
import { Scheduler } from './engine/scheduler';
import { createServer } from './server';
import { registerProvider, getProvider, listProviders } from './provider';

import { WebhookProvider } from '../../providers/webhook';
import { DelayProvider } from '../../providers/delay';
import { AnchorProvider } from '../../providers/anchor';
import { StellarProvider } from '../../providers/stellar';

export {
  createServer,
  initSchema,
  getPool,
  Scheduler,
  registerProvider,
  getProvider,
  listProviders,
};

let defaultScheduler: Scheduler | null = null;
let initialized = false;

export async function initRuntime(): Promise<void> {
  if (initialized) return;
  await initSchema();
  registerProvider(new WebhookProvider());
  registerProvider(new DelayProvider());
  registerProvider(new AnchorProvider());
  registerProvider(new StellarProvider());
  defaultScheduler = new Scheduler();
  defaultScheduler.start();
  initialized = true;
}

export async function startServer(port?: number) {
  await initRuntime();
  const PORT = port ?? parseInt(process.env.PORT ?? '3001', 10);
  const app = createServer();
  const server = app.listen(PORT, () => {
    console.log(`[MesaRuntime] Runtime listening on http://localhost:${PORT}`);
    console.log(`[MesaRuntime] Health: http://localhost:${PORT}/health`);
    console.log(`[MesaRuntime] Dashboard: http://localhost:${PORT}/dashboard`);
  });

  process.on('SIGTERM', () => {
    defaultScheduler?.stop();
    server.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    defaultScheduler?.stop();
    server.close();
    process.exit(0);
  });

  return { app, server, scheduler: defaultScheduler };
}

export async function main() {
  console.log('');
  console.log('  ███╗   ███╗███████╗███████╗ █████╗ ');
  console.log('  ████╗ ████║██╔════╝██╔════╝██╔══██╗');
  console.log('  ██╔████╔██║█████╗  ███████╗███████║');
  console.log('  ██║╚██╔╝██║██╔══╝  ╚════██║██╔══██║');
  console.log('  ██║ ╚═╝ ██║███████╗███████║██║  ██║');
  console.log('  ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝');
  console.log('');
  console.log('  Financial Workflow Runtime for Stellar');
  console.log('');

  return await startServer();
}

// Default export for backward compatibility
export default {
  createServer,
  startServer,
  initRuntime,
  main,
};

// Auto-run if executed directly as entry script
if (require.main === module) {
  main().catch(err => {
    console.error('[MesaRuntime] Fatal startup error:', err);
    process.exit(1);
  });
}
