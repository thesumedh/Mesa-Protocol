import * as dotenv from 'dotenv';
dotenv.config();

import { initSchema } from './store';
import { Scheduler } from './engine/scheduler';
import { createServer } from './server';

import { registerProvider } from './provider';
import { WebhookProvider } from '../../providers/webhook';
import { DelayProvider } from '../../providers/delay';
import { AnchorProvider } from '../../providers/anchor';
import { StellarProvider } from '../../providers/stellar';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
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

  // Initialize database
  await initSchema();

  // Register built-in providers
  registerProvider(new WebhookProvider());
  registerProvider(new DelayProvider());
  registerProvider(new AnchorProvider());
  registerProvider(new StellarProvider());

  // Start scheduler
  const scheduler = new Scheduler();
  scheduler.start();

  // Start HTTP server
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[MesaRuntime] Runtime listening on http://localhost:${PORT}`);
    console.log(`[MesaRuntime] Health: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    scheduler.stop();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    scheduler.stop();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[MesaRuntime] Fatal startup error:', err);
  process.exit(1);
});
