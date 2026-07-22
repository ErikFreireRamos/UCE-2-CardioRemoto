import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';

async function start() {
  const env = loadEnv();
  const app = await buildApp({ logger: true });

  try {
    // Escuta em 0.0.0.0 para permitir acesso pela rede local (testar no celular).
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`CardioRemoto API ouvindo em http://${env.HOST}:${env.PORT} · docs em /docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
