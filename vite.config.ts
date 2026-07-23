import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: '/UI/studio.html',
    proxy: {
      '/executions': 'http://localhost:3001',
      '/flows': 'http://localhost:3001',
      '/webhooks': 'http://localhost:3001',
      '/providers': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/dashboard': 'http://localhost:3001',
    }
  },
  plugins: [
    {
      name: 'studio-route-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/studio' || req.url === '/studio/') {
            res.writeHead(302, { Location: '/UI/studio.html' });
            return res.end();
          }
          if (req.url === '/docs' || req.url === '/docs/') {
            res.writeHead(302, { Location: '/UI/docs.html' });
            return res.end();
          }
          if (req.url === '/export' || req.url === '/export/') {
            res.writeHead(302, { Location: '/UI/export.html' });
            return res.end();
          }
          if (req.url === '/' || req.url === '') {
            res.writeHead(302, { Location: '/UI/index.html' });
            return res.end();
          }
          next();
        });
      }
    }
  ]
});
