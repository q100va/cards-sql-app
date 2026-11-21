// cypress.config.ts
import { defineConfig } from 'cypress';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { configureCypress } from './cypress/safety/node.mjs';
import { SPECS } from './cypress/safety/policy.mjs';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:56379',
    // setupNodeEvents replaces this with the mode's exact approved file list.
    specPattern: [...SPECS.stub],
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    env: {
      API_URL: 'http://localhost:8080',
      USE_STUBS: process.env['E2E_MODE'] === 'stub' ? '1' : process.env['E2E_MODE'] === 'live' ? '0' : '',
    },
    setupNodeEvents(on, config) {
      return configureCypress(on, config);

      /*       on('task', {
        async 'db:reset'() {
          const scriptPath = path.resolve(
            __dirname,
            '../server/scripts/reset-test-db.mjs'
          );
          // 👇 принудительно «новый» модуль каждый раз
          const { reset } = await import(
            `${pathToFileURL(scriptPath).href}?v=${Date.now()}`
          );
          const ok = await reset();
          return ok ? 'db-reset:done:v1' : 'db-reset:fail';
        },
      }); */

      /*       on('task', {
        'db:reset': () =>
          new Promise((resolve, reject) => {
            const script = path.resolve(
              __dirname,
              '../server/scripts/reset-test-db.mjs'
            );
            const cp = spawn(
              process.execPath,
              ['-r', 'dotenv/config', script],
              {
                stdio: 'inherit', // покажет логи сидера
                env: {
                  ...process.env,
                  NODE_ENV: 'test',
                  DOTENV_CONFIG_PATH: 'server/.env.test',
                },
              }
            );
            cp.on('exit', (code) =>
              code === 0
                ? resolve('db-reset:done:v1')
                : reject(new Error('reset failed'))
            );
          }),
      }); */
    },
  },
});
