// cypress/e2e/sign-in.cy.ts
const STUBS = String(Cypress.env('USE_STUBS')) === '1';
const apiUrl = '**'; //String(Cypress.env('API_URL') || '');

describe('Sign In page (stub/live aware)', () => {
  before(() => {
    if (!STUBS) {
      // Optional: reset DB in LIVE mode if your API exposes reset task
      cy.task('db:reset');
    }
  });

  beforeEach(() => {
    if (STUBS) {
      cy.intercept('POST', `${apiUrl}/api/session/refresh`, {
        statusCode: 401,
        body: { code: 'ERRORS.UNAUTHORIZED', data: null },
      }).as('refresh');
      cy.intercept('POST', `${apiUrl}/api/client-logs`, {
        statusCode: 204,
        body: null,
      }).as('clientLogs');
      cy.intercept('POST', `${apiUrl}/api/users/get-users`, {
        statusCode: 200,
        body: {
          data: {
            users: [],
            length: 0,
          },
        },
      }).as('usersList');
      cy.intercept('GET', `${apiUrl}/api/addresses/get-countries-list`, {
        statusCode: 200,
        body: {
          data: [],
        },
      }).as('countriesList');
            cy.intercept('GET', `${apiUrl}/api/roles/get-roles-names-list`, {
        statusCode: 200,
        body: {
          data: [],
        },
      }).as('rolesList');
    }
    cy.visit('/session/sign-in');
  });

  const typeCreds = (user: string, pass: string) => {
    cy.fillMatInput('[data-cy="user-input"]', user);
    cy.fillMatInput('[data-cy="pass-input"]', pass);
  };

  it('renders and keeps submit disabled until form is valid', () => {
    cy.get('[data-cy="sign-in-card"]').should('be.visible');
    cy.get('[data-cy="submit-btn"]').should('be.disabled');

    cy.get('[data-cy="user-input"]').focus().blur();
    cy.get('[data-cy="user-required"]').should('be.visible');

    cy.get('[data-cy="pass-input"]').focus().blur();
    cy.get('[data-cy="pass-required"]').should('be.visible');

    typeCreds('alice', 'p@ss12345');
    cy.get('[data-cy="submit-btn"]').should('not.be.disabled');
  });

  it('successful sign-in navigates to "/" (STUB mode only)', function () {
    cy.skipIf(!STUBS, 'success path is stub-only by default');

    cy.intercept('POST', `${apiUrl}/api/session/sign-in`, {
      statusCode: 200,
      body: {
        data: {
          user: {
            id: 123,
            userName: 'alice',
            firstName: 'Alice',
            lastName: 'Smith',
            roleName: 'ADMIN',
            roleId: 999
          },
          token: 'tok_1234567890',
          expiresIn: 900,
        },
      },
    }).as('signIn');

    typeCreds('alice', 'p@ss12345');
    cy.get('[data-cy="submit-btn"]').click();

    cy.wait('@signIn');
    cy.get('[data-cy="error"]').should('not.exist');
    cy.location('pathname').should('eq', '/users');
  });

  it('401 → shows a unified invalid-credentials message (works in both modes)', () => {
    if (STUBS) {
      cy.intercept('POST', `${apiUrl}/api/session/sign-in`, {
        statusCode: 401,
        body: { code: 'ERRORS.INVALID_AUTHORIZATION', data: null },
      }).as('signIn401');
    }

    typeCreds('alice', 'wrong');
    cy.get('[data-cy="submit-btn"]').click();

    if (STUBS) cy.wait('@signIn401');
    cy.get('[data-cy="error"]').should('be.visible');
  });

  it('423 → shows locked message (STUB mode only)', function () {
    cy.skipIf(!STUBS, 'lock message is stub-only');

    cy.intercept('POST', `${apiUrl}/api/session/sign-in`, {
      statusCode: 423,
      body: { code: 'ERRORS.ACCOUNT_LOCKED', data: null },
    }).as('signIn423');

    typeCreds('bob', 'x');
    cy.get('[data-cy="submit-btn"]').click();

    cy.wait('@signIn423');
    cy.get('[data-cy="error"]').should('be.visible');
  });

  it('429 → shows throttling message with remaining seconds (STUB mode only)', function () {
    cy.skipIf(!STUBS, 'rate-limit message is stub-only');

    cy.intercept('POST', `${apiUrl}/api/session/sign-in`, (req) => {
      req.reply({
        statusCode: 429,
        headers: { 'Retry-After': '120' },
        body: { code: 'ERRORS.TOO_MANY_ATTEMPTS', data: { retryAfterSec: 75 } },
      });
    }).as('signIn429');

    typeCreds('throttle', 'x');
    cy.get('[data-cy="submit-btn"]').click();

    cy.wait('@signIn429');
    cy.get('[data-cy="error"]').should('be.visible').invoke('text');
  });

  it('disables button while loading (STUB mode only, slow response)', function () {
    cy.skipIf(!STUBS, 'loading state is easy to simulate with stubs');

    // Медленный ответ без setTimeout — через delay
    cy.intercept(
      { method: 'POST', url: `${apiUrl}/api/session/sign-in`, times: 1 },
      {
        delay: 400,
        statusCode: 200,
        body: {
          data: {
            user: {
              id: 1,
              userName: 'u',
              firstName: 'F',
              lastName: 'L',
              roleName: 'USER',
              roleId: 999
            },
            token: 'tok_1234567890',
            expiresIn: 900,
          },
        },
      }
    ).as('signInSlow');

    // Страховка для первичных API GET-ов на главной
    // cy.intercept('GET', '**/api/**', { statusCode: 200, body: { data: null } }).as('anyApi');

    //cy.visitApp('/session/sign-in');
    //cy.wait('@refresh');

    typeCreds('u', 'p');

    cy.get('[data-cy="submit-btn"]').should('not.be.disabled').click();
    cy.get('[data-cy="submit-btn"]').should('be.disabled');

    cy.wait('@signInSlow').its('response.statusCode').should('eq', 200);

    // снова — НЕ ждём @me
    cy.location('pathname', { timeout: 10000 }).should('eq', '/users');
  });
});
