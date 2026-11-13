import app from './app';
import { config } from './config';
import { testConnection } from './db';

async function start(): Promise<void> {
  try {
    await testConnection();
  } catch (err) {
    console.error(
      'Failed to connect to database:',
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(
      `Server running on port ${config.port} [${config.nodeEnv}]`
    );
  });
}

start();

