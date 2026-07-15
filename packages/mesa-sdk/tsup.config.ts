import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

const globalsPlugin = {
  name: 'globals',
  setup(build: any) {
    build.onResolve({ filter: /@stellar\/stellar-sdk/ }, () => ({
      path: '@stellar/stellar-sdk',
      namespace: 'globals',
    }));
    build.onResolve({ filter: /@stellar\/freighter-api/ }, () => ({
      path: '@stellar/freighter-api',
      namespace: 'globals',
    }));
    build.onLoad({ filter: /.*/, namespace: 'globals' }, (args: any) => {
      let contents = '';
      if (args.path === '@stellar/stellar-sdk') {
        contents = 'module.exports = window.StellarSdk;';
      } else if (args.path === '@stellar/freighter-api') {
        contents = 'module.exports = window.FreighterAPI || window.freighterApi || window.FreighterApi;';
      }
      return { contents, loader: 'js' };
    });
  },
};

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@stellar/stellar-sdk', '@stellar/freighter-api'],
  },
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    splitting: false,
    sourcemap: true,
    clean: true,
    globalName: 'MesaSDKBundle',
    esbuildPlugins: [globalsPlugin],
    external: ['@stellar/stellar-sdk', '@stellar/freighter-api'],
    async onSuccess() {
      try {
        const srcPath = path.resolve('dist/index.global.js');
        const destPath = path.resolve('../../js/mesa-sdk.js');
        
        await new Promise(r => setTimeout(r, 200));

        if (fs.existsSync(srcPath)) {
          let code = fs.readFileSync(srcPath, 'utf8');
          // Expose globally as window.MesaSDK
          code = code.replace('var MesaSDKBundle =', 'window.MesaSDK =');
          // Add a safety fallback for window
          code = `(function() {
            if (typeof window !== 'undefined') {
              ${code}
            }
          })();`;
          fs.writeFileSync(destPath, code, 'utf8');
          console.log('✓ Successfully copied browser bundle to js/mesa-sdk.js');
        }
      } catch (e) {
        console.error('Failed to copy browser bundle:', e);
      }
    }
  }
]);
