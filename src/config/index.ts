import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  nodeEnv: string;
  db: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: requireEnv('DATABASE_HOST'),
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: requireEnv('DATABASE_NAME'),
    user: requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
  },
};

