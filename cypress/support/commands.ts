// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// cypress/support/commands.ts

declare global {
  namespace Cypress {
    interface Chainable {
      login(options?: {
        user?: string;
        pass?: string;
        viaApi?: boolean; // оставляем, если захочешь логин UI vs API
        noVisit?: boolean; // 👈 новый флаг
      }): Chainable<any>;
      fillMatInput(selector: string, value: string, options?: Pick<TypeOptions, 'log'>): Chainable<void>;
    }
  }
}

Cypress.Commands.add('fillMatInput', (sel: string, value: string, options: Pick<Cypress.TypeOptions, 'log'> = { log: true }) => {
  cy.get(sel)
    .should('be.visible')
    .and('not.be.disabled')
    .scrollIntoView()
    .then(($el) => {
      const el = $el[0] as HTMLInputElement;
      if (el.ownerDocument.activeElement !== el) cy.wrap($el).focus();
    })
    .should('be.focused')
    .type('{selectall}{backspace}', options)
    .type(value, options);
});

Cypress.Commands.add(
  'login',
  (options?: {
    user?: string;
    pass?: string;
    viaApi?: boolean;
    noVisit?: boolean;
  }) => {
    const STUBS = String(Cypress.env('USE_STUBS')) === '1';
    const user = options?.user ?? 'superAdmin';
    const pass = options?.pass ?? 'p@ss12345';

    console.log('STUBS', STUBS);

    if (STUBS) {
      cy.intercept('POST', '**/api/client-logs', {
        statusCode: 204,
        body: null,
      });

      // Register the fallback first: Cypress checks later routes first.
      cy.intercept('POST', '**/api/session/refresh', {
        statusCode: 200,
        body: { data: { accessToken: 'tok_ref_1234567890', expiresIn: 900 } },
      }).as('refreshOk');

      // 1-й refresh (если прилетит на старте) → 401
      cy.intercept(
        { method: 'POST', url: '**/api/session/refresh', times: 1 },
        {
          statusCode: 401,
          body: { code: 'ERRORS.UNAUTHORIZED', data: null },
        }
      ).as('refreshInit');

      // guard /me → 200
      cy.intercept('GET', '**/api/session/me', {
        statusCode: 200,
        body: {
          data: {
            id: 1,
            userName: user,
            firstName: 'F',
            lastName: 'L',
            roleName: 'USER',
            roleId: 999,
          },
        },
      }).as('me');

      // успешный логин
      cy.intercept('POST', '**/api/session/sign-in', {
        statusCode: 200,
        body: {
          data: {
            user: {
              id: 1,
              userName: user,
              firstName: 'F',
              lastName: 'L',
              roleName: 'USER',
              roleId: 999,
            },
            token: 'tok_1234567890',
            expiresIn: 900,
          },
        },
      }).as('signIn');

      /* // UI-логин
      cy.visit('/session/sign-in');
      cy.fillMatInput('[data-cy="user-input"]', user);
      cy.fillMatInput('[data-cy="pass-input"]', pass);
      cy.get('[data-cy="submit-btn"]').click();
      cy.wait('@signIn');

      // принимаем и '/', и '/users'
      cy.location('pathname', { timeout: 10000 }).should((p) => {
        expect(['/', '/users']).to.include(p);
      });
      return; */

      return cy
        .visit('/session/sign-in')
        .then(() => {
          cy.get('[data-cy="sign-in-page"]', { timeout: Cypress.config('pageLoadTimeout') }).should('be.visible');
        })
        .then(() => {
          cy.fillMatInput('[data-cy="user-input"]', user);
          cy.fillMatInput('[data-cy="pass-input"]', pass, { log: false });
          cy.get('[data-cy="submit-btn"]').click();
          cy.wait('@signIn', { log: false });
          cy.wait('@perms', { log: false });
        })
        .then(() => {
          if (!options?.noVisit) {
            cy.location('pathname', { timeout: 15000 }).should((p) => {
              expect(['/', '/users']).to.include(p);
            });
          }
        });
    }

    // === LIVE ===
    /*     const API_URL = String(Cypress.env('API_URL') || 'http://localhost:8080');
    if (options?.viaApi) {
      // Логин через API (сервер поставит HttpOnly refresh-cookie)
      return cy
        .request('POST', `${API_URL}/api/session/sign-in`, {
          userName: user,
          password: pass,
        })
        .its('status')
        .should('be.oneOf', [200, 201])
        .then(() => {
          if (!options?.noVisit) cy.visit('/');
        })
    }

    // Логин через UI с кэшированием сессии
    return cy
      .session(
        ['live', user],
        () => {
          cy.visit('/session/sign-in');
          cy.fillMatInput('[data-cy="user-input"]', user);
          cy.fillMatInput('[data-cy="pass-input"]', pass);
          cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
          cy.location('pathname', { timeout: 15000 }).should(
            'match',
            /^\/(users|)$/
          );
        },
        { cacheAcrossSpecs: true }
      )
      .then(() => {
        if (!options?.noVisit) cy.visit('/');
      }) */

    // === LIVE MODE ===
    const API_URL = String(Cypress.env('API_URL') || 'http://localhost:8080');
    if (options?.viaApi) {
      // Fast path: set refresh cookie via API, app will hydrate on first 401
      cy.request({
        method: 'POST', url: `${API_URL}/api/session/sign-in`, log: false,
        body: { userName: user, password: pass },
      })
        .its('status')
        .should('be.oneOf', [200, 201]);

      // Now just visit app; interceptor will refresh using HttpOnly cookie
      cy.visit('/');
      return;
    }

    // Default LIVE: do real UI login (no stubs)
    cy.visit('/session/sign-in');
    cy.get('[data-cy="sign-in-page"]', { timeout: Cypress.config('pageLoadTimeout') }).should('be.visible');
    cy.fillMatInput('[data-cy="user-input"]', user);
    cy.fillMatInput('[data-cy="pass-input"]', pass, { log: false });
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();

    cy.location('pathname', { timeout: 10000 }).should((p) => {
      expect(['/', '/users']).to.include(p);
    });
  }
);

export {};
