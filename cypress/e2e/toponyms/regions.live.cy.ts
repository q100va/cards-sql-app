// cypress/e2e/toponyms/regions.live.cy.ts
/// <reference types="cypress" />
import { apiLogin, createRegion, deleteRegion } from './_helpers';
import { checkRegionSort } from './_assertions';

const UNIQUE = `e2e-region-${Date.now()}`;

describe('Toponyms (live): Regions list', () => {
  let createdId: number | null = null;
  let secondId: number | null = null;

  before(() => {
    // чистая БД
    cy.task('db:reset', null, { timeout: 180_000, log: false })
      .should('eq', 'db-reset:done:v1');

    // login via API → сохраним ACCESS_TOKEN
    apiLogin({ user: 'superAdmin', pass: 'p@ss12345' }).then(() =>
      createRegion({ name: UNIQUE, countryId: 143 }).then((r) => {
        createdId = r.id;
        return createRegion({ name: `${UNIQUE}-z`, countryId: 143 }).then((region) => { secondId = region.id; });
      })
    );
  });

  after(() => {
    if (createdId !== null) deleteRegion(createdId);
    if (secondId !== null) return deleteRegion(secondId);
  });

  beforeEach(() => {
    // UI-логин (как в проекте)
    cy.login({ user: 'superAdmin', pass: 'p@ss12345', noVisit: true });
    cy.intercept('GET', '**/api/auth/permissions').as('getPerms');
    cy.visit('/');
    cy.wait('@getPerms', { log: false });

    cy.get('button[data-cy="profileMenu"]').click();
    cy.get('button[data-cy="nav-toponyms"]').click();
    cy.get('button[data-cy="nav-regions"]').click();
    cy.location('pathname', { timeout: 10_000 }).should('eq', '/regions');
    cy.get('[data-cy="table"]').should('be.visible');
    cy.get('app-toponyms-list .overlay').should('not.exist');
  });

  it('loads and shows seeded region by search', () => {
    cy.intercept('GET', '**/api/toponyms/toponyms*', (req) => {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      if (req.query.search === UNIQUE) req.alias = 'ownedRegions';
    });
    cy.get('[data-cy="search-input"]')
      .should('be.visible')
      .focus()
      .type(`${UNIQUE}`)
      .type('{enter}');
    cy.wait('@ownedRegions').then(({ request, response }) => {
      expect(request.query).to.include({ type: 'region', search: UNIQUE, countries: '143' });
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data.toponyms.map((region: { id: number }) => region.id)).to.deep.eq([createdId, secondId]);
    });
    cy.contains('[data-cy="row"] td.mat-column-name', new RegExp(`^\\s*${UNIQUE}\\s*$`)).should('contain.text', UNIQUE);
  });

  it('sort toggles', () => {
    cy.intercept('GET', '**/api/toponyms/toponyms*', (req) => {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      if (req.query.search === UNIQUE) req.alias = 'list';
    });
    cy.get('[data-cy="search-input"]').focus().clear().type(`${UNIQUE}{enter}`);
    cy.wait('@list').then(({ request, response }) => {
      expect(request.query.search).to.eq(UNIQUE);
      expect(response?.statusCode).to.eq(200);
    });
    checkRegionSort([UNIQUE, `${UNIQUE}-z`], [`${UNIQUE}-z`, UNIQUE], UNIQUE);
  });
});
