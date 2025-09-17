// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
// cypress/support/e2e.ts

// 1) Подключаем кастомные команды (login и т.д.)
// cypress/support/e2e.ts

import './commands';

// ---- helpers ----
Cypress.Commands.add('skipIf', (cond: boolean, reason?: string) => {
  if (cond) {
    cy.log(`⏭ skipping: ${reason || ''}`);
    // @ts-ignore - access Mocha runnable
    cy.state('runnable')?.skip();
  }
});

Cypress.Commands.add(
  'visitApp',
  (path: string = '/', options: Partial<Cypress.VisitOptions> = {}) => {
    // IMPORTANT: return the cy.visit(...) chain, but cast it to Chainable<Window>
    return cy.visit(path, {
      ...options,
      onBeforeLoad: (win) => {
        try {
          win.localStorage.setItem('app.lang', 'en');
        } catch {}
        if (typeof options.onBeforeLoad === 'function') {
          // preserve user-supplied onBeforeLoad
          (options.onBeforeLoad as (w: Window) => void)(win);
        }
      },
    }) as unknown as Cypress.Chainable<Window>;
  }
);

// Disable animations for test stability
beforeEach(() => {
  cy.document().then((doc) => {
    const style = doc.createElement('style');
    style.innerHTML = `
      *, *::before, *::after { transition: none !important; animation: none !important; }
      .cdk-overlay-container, .cdk-overlay-pane, .mat-mdc-dialog-container { transition: none !important; animation: none !important; opacity: 1 !important; transform: none !important;
      } .mdc-floating-label, mat-label { pointer-events: none !important; } /* клики проходят сквозь лейбл */
    `;
    doc.head.appendChild(style);
  });
});

// ---- Type augmentation for custom commands ----
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Skips the current test when cond === true.
       */
      skipIf(cond: boolean, reason?: string): void;

      /**
       * Visit with app.lang='en' set BEFORE Angular bootstraps.
       * Keeps return type chainable as Cypress expects (Window).
       */
      visitApp(
        path?: string,
        options?: Partial<Cypress.VisitOptions>
      ): Chainable<Window>;
    }
  }
}

export {};
