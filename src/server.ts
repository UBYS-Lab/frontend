import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(__dirname, '../browser');
const indexHtml = join(browserDistFolder, 'index.csr.html');

const app = express();

/**
 * Return ngrok public URL (if ngrok container is running)
 */
app.get('/ngrok-url', async (_req, res) => {
  try {
    const response = await fetch('http://ngrok:4040/api/tunnels');
    const data: any = await response.json();
    const url = data?.tunnels?.[0]?.public_url ?? null;
    res.json({ url });
  } catch {
    res.json({ url: null });
  }
});

/**
 * Proxy /api requests to backend
 */
const backendUrl = process.env['BACKEND_URL'] ?? 'http://127.0.0.1:8001';
app.use(createProxyMiddleware({
  pathFilter: '/api',
  target: backendUrl,
  changeOrigin: true,
}));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * All other routes → serve index.html (SPA fallback)
 */
app.use((_req, res) => {
  res.sendFile(indexHtml);
});

const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`Node Express server listening on http://localhost:${port}`);
});
