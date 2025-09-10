// cypress.config.ts
import { defineConfig } from 'cypress';

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
          process.env['DOTENV_CONFIG_PATH'] = process.env['DOTENV_CONFIG_PATH'] || 'server/.env.test';

          // @ts-ignore JS ESM без типов — ок
          const mod = (await import('./server/scripts/reset-test-db.mjs')) as {
            reset: () => Promise<unknown>;
          };

          console.log('[cypress task] db:reset → start');
          await mod.reset();
          console.log('[cypress task] db:reset → done');
          return null;
        },
      });
    },
/*      retries: { runMode: 2, openMode: 1 },
    defaultCommandTimeout: 8000,
    requestTimeout: 15000, */
  },
});
