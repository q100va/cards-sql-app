// cypress.config.ts
import { defineConfig } from 'cypress';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:56379',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts,jsx,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    env: {
      API_URL: 'http://localhost:8080',
      USE_STUBS: '0',
    },
    setupNodeEvents(on) {
      on('task', {
        async 'db:reset'() {
          process.env['NODE_ENV'] = 'test';
          process.env['DOTENV_CONFIG_PATH'] =
            process.env['DOTENV_CONFIG_PATH'] || 'server/.env.test';

          // @ts-ignore JS ESM без типов — ок
          const mod = (await import('./server/scripts/reset-test-db.mjs')) as {
            reset: () => Promise<unknown>;
          };

          console.log('[cypress task] db:reset → start');
          await mod.reset();
          console.log('[cypress task] db:reset → done');
          return 'db-reset:done:v1';
        },
      });

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
