// knex-wrapper.js
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import tsNode from 'ts-node';

// Регистрируем ts-node
tsNode.register({
  transpileOnly: true,
  esm: true,
  experimentalSpecifierResolution: 'node'
});

const require = createRequire(import.meta.url);
const configPath = pathToFileURL('./src/config/knex/knexfile.ts').href;

// Динамический импорт TypeScript-конфига
const config = await import(configPath);
export default config.default;