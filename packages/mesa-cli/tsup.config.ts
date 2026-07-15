import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  async onSuccess() {
    fs.copyFileSync(
      path.resolve('src/mesa_vault.wasm'),
      path.resolve('dist/mesa_vault.wasm')
    );
  }
});
