import env from "../env/env.js";
import { Knex } from "knex";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getBasePath = () => {
  if (env.NODE_ENV === 'production') {
    return path.resolve(__dirname, '../..'); 
  }
  return path.resolve(__dirname, '../../..');
};

const basePath = getBasePath();

const connectionSchema = z.object({
    host: z.string(),
    port: z.number(),
    database: z.string(),
    user: z.string(),
    password: z.string(),
});

const NODE_ENV = env.NODE_ENV ?? "development";

const knexConfigs: Record<string, Knex.Config> = {
    development: {
        client: "pg",
        connection: () => connectionSchema.parse({
            host: env.POSTGRES_HOST ?? "localhost",
            port: env.POSTGRES_PORT ?? 5432,
            database: env.POSTGRES_DB ?? "postgres",
            user: env.POSTGRES_USER ?? "postgres",
            password: env.POSTGRES_PASSWORD ?? "postgres",
        }),
        migrations: {
            directory: path.join(basePath, 'postgres/migrations'),
            tableName: "migrations",
            extension: "ts",
            loadExtensions: ['.js', '.ts'],
        },
        seeds: {
            directory: path.join(basePath, 'postgres/seeds'),
            extension: "js",
        },
    },
    production: {
        client: "pg",
        connection: () => connectionSchema.parse({
            host: env.POSTGRES_HOST,
            port: env.POSTGRES_PORT,
            database: env.POSTGRES_DB,
            user: env.POSTGRES_USER,
            password: env.POSTGRES_PASSWORD,
        }),
        migrations: {
            directory: path.join(basePath, 'postgres/migrations'),
            tableName: "migrations",
            extension: "js",
            loadExtensions: ['.js'],
        },
        seeds: {
            directory: path.join(basePath, 'postgres/seeds'),
            extension: "js",
        },
    },
    test: {
        client: "pg",
        connection: () => connectionSchema.parse({
            host: env.POSTGRES_HOST ?? "localhost",
            port: env.POSTGRES_PORT ?? 5432,
            database: "test_db",
            user: env.POSTGRES_USER ?? "postgres",
            password: env.POSTGRES_PASSWORD ?? "postgres",
        }),
        migrations: {
            directory: path.join(basePath, 'postgres/migrations'),
            tableName: "migrations",
            extension: "ts",
            loadExtensions: ['.js', '.ts'],
        },
        seeds: {
            directory: path.join(basePath, 'postgres/seeds'),
            extension: "js",
        },
    },
};

export default knexConfigs[NODE_ENV];