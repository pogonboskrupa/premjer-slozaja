import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const { createServer } = await import('vite');
const server = await createServer({
  configFile: resolve(__dirname, 'vite.config.ts'),
  root: __dirname,
  server: { port: 5173, host: true },
});
await server.listen();
server.printUrls();
