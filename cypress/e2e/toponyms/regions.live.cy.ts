// cypress/e2e/toponyms/regions.live.cy.ts
/// <reference types="cypress" />
import { apiLogin, createRegion, deleteRegion } from './_helpers';

const UNIQUE = `e2e-region-${Date.now()}`;

describe('Toponyms (live): Regions list', () => {
  let createdId: number | null = null;

  before(() => {
    // чистая БД
    cy.task('db:reset', null, { timeout: 180_000, log: false })
      .should('eq', 'db-reset:done:v1');

    // login via API → сохраним ACCESS_TOKEN
    apiLogin({ user: 'superAdmin', pass: 'p@ss12345' }).then(() =>
      createRegion({ name: UNIQUE }).then((r) => {
        createdId = r.id;
      })
    );
  });

  after(() => {
    if (createdId) deleteRegion(createdId);
  });

  beforeEach(() => {
    // UI-логин (как в проекте)
    cy.login({ user: 'superAdmin', pass: 'p@ss12345', noVisit: true });
    cy.intercept('GET', '**/api/auth/permissions').as('getPerms');
    cy.visit('/');
    cy.wait('@getPerms');

    cy.get('button[data-cy="profileMenu"]').click({ force: true });
    cy.get('button[data-cy="nav-toponyms"]').click({ force: true });
    cy.get('button[data-cy="nav-regions"]').click({ force: true });
    cy.location('pathname', { timeout: 10_000 }).should('eq', '/regions');
  });

  it('loads and shows seeded region by search', () => {
   // cy.get('input[matinput]').first().type(`${UNIQUE}{enter}`);
      const sel = '[data-cy="search-input"], input[matinput]';
    cy.get(sel)
      .should('exist')
      .click({ force: true })
      .type(`${UNIQUE}`)
      .type('{enter}');
    cy.get('table[mat-table] tbody tr').first().should('contain.text', UNIQUE);
  });

  it('sort toggles', () => {
    cy.get('th[mat-sort-header]').first().click();
    cy.get('th[mat-sort-header]').first().should('have.attr', 'aria-sort');
  });
});
