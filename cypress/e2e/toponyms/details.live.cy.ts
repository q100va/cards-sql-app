/// <reference types="cypress" />
import { apiLogin, createRegion, deleteRegion } from './_helpers';
import type { Toponym } from '../../../shared/schemas/toponym.schema';

const UNIQUE = `e2e-region-${Date.now()}`;
const EDITED = `e2e-details-${Date.now()}-edited`;
const BASE = `e2e-details-${Date.now()}-edited-again`;

describe('Toponyms (live): Region details dialog', () => {
  let id: number | null = null;
  let currentName = UNIQUE;
  let fixtureName = UNIQUE;
  let fixtureSequence = 0;

  before(() => {
    cy.task('db:reset', null, { timeout: 180_000, log: false }).should('eq', 'db-reset:done:v1');
    apiLogin({ user: 'superAdmin', pass: 'p@ss12345' });
  });

  afterEach(() => {
    if (id !== null) return deleteRegion(id).then(() => { id = null; });
  });

  beforeEach(() => {
    id = null;
    fixtureName = `${UNIQUE}-${++fixtureSequence}`;
    currentName = fixtureName;
    createRegion({ name: fixtureName, shortName: UNIQUE, countryId: 143 }).then((region) => { id = region.id; });
  });

  beforeEach(() => {
    cy.login();
    cy.then(() => {
      expect(id).to.be.a('number').and.be.greaterThan(0);
      return cy.request<{ data: Toponym }>({
        method: 'GET',
        log: false,
        url: `${Cypress.env('API_URL')}/api/toponyms/get-region-by-id/${id}`,
        headers: { Authorization: `Bearer ${Cypress.env('ACCESS_TOKEN')}` },
      }).then(({ status, body }) => {
        expect(status).to.eq(200);
        expect(body.data.id).to.eq(id);
        expect(body.data.name).to.eq(fixtureName);
        currentName = body.data.name;
      });
    });
    cy.visitApp('/regions');
  });

  function openCreatedRegion(name: string) {
    cy.intercept('GET', '**/api/toponyms/toponyms*', (req) => {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      if (req.query.search === name) req.alias = 'ownedRegion';
    });
    cy.intercept('GET', '**/api/toponyms/get-region-by-id/*', (req) => {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
    }).as('regionById');
    cy.intercept('GET', '**/api/toponyms/get-toponyms-list*', (req) => {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      if (req.query.typeOfToponym === 'countries') req.alias = 'dlgCountries';
      if (req.query.typeOfToponym === 'regions') req.alias = 'dlgRegions';
    });
    cy.get('app-toponyms-list .overlay').should('not.exist');
    cy.get('[data-cy="search-input"]').should('be.visible').focus().clear().type(`${name}{enter}`);
    cy.wait('@ownedRegion').then(({ request, response }) => {
      expect(request.query.search).to.eq(name);
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data.toponyms.map((region: { id: number }) => region.id)).to.deep.eq([id]);
    });
    cy.contains('[data-cy="row"]', name).find('[data-cy="open-menu-actions"]').click();
    cy.get('[data-cy="open-card"]').click();
    cy.wait('@regionById').then(({ request, response }) => {
      expect(new URL(request.url).pathname).to.eq(`/api/toponyms/get-region-by-id/${id}`);
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data).to.include({ id, name });
    });
    cy.get('.mat-mdc-dialog-container').should('be.visible');
    cy.wait('@dlgCountries').its('response.statusCode').should('eq', 200);
    cy.wait('@dlgRegions').its('response.statusCode').should('eq', 200);
    cy.get('.mat-mdc-dialog-container .overlay').should('not.exist');
    cy.get('.mat-mdc-dialog-container input[data-cy="name"]').should('have.value', name).and('be.disabled');
  }

  function saveName(name: string, action: 'justSave' | 'saveAndExit') {
    cy.intercept('GET', '**/api/toponyms/check-toponym-name*').as('checkName');
    cy.intercept('POST', '**/api/toponyms/update-toponym').as('saveRegion');
    cy.get('.mat-mdc-dialog-container button[title="Edit"]').click();
    cy.get('.mat-mdc-dialog-container mat-select[formcontrolname="country"]').should('contain.text', 'Россия');
    cy.get('.mat-mdc-dialog-container input[data-cy="name"]').should('not.be.disabled').clear().type(name);
    const save = action === 'justSave' ? 'button[title="Save"]' : 'button.dialog-submit-button';
    cy.get(`.mat-mdc-dialog-container ${save}`).should('not.be.disabled').click();
    cy.wait('@checkName').then(({ request, response }) => {
      expect(String(request.query.countryId), 'countryId in check-toponym-name').to.match(/^\d+$/);
      expect(request.query).to.include({ type: 'region', id: String(id), name, countryId: '143' });
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data).to.eq(false);
    });
    cy.wait('@saveRegion').then(({ request, response }) => {
      expect(request.method).to.eq('POST');
      expect(request.body).to.include({ type: 'region', id, name, countryId: 143, shortName: UNIQUE });
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data).to.include({ id, name, shortName: UNIQUE });
      expect(response?.body.data.defaultAddressParams.countryId).to.eq(143);
    });
  }

  it('justSave keeps dialog open and switches to view', () => {
    cy.then(() => openCreatedRegion(currentName));
    saveName(EDITED, 'justSave');
    cy.get('.mat-mdc-dialog-container').should('be.visible');
    cy.get('.mat-mdc-dialog-container button[title="Edit"]').should('exist');
    cy.get('.mat-mdc-dialog-container input[data-cy="name"]').should('have.value', EDITED).and('be.disabled');
    cy.get('.mat-mdc-dialog-container button[title="Close"]').click();
    cy.get('.mat-mdc-dialog-container').should('not.exist');
    cy.reload();
    openCreatedRegion(EDITED);
    cy.get('.mat-mdc-dialog-container input[data-cy="name"]').should('have.value', EDITED);
  });

  it('saveAndExit closes dialog', () => {
    cy.then(() => openCreatedRegion(currentName));
    saveName(BASE, 'saveAndExit');
    cy.get('.mat-mdc-dialog-container').should('not.exist');
    cy.reload();
    openCreatedRegion(BASE);
    cy.get('.mat-mdc-dialog-container input[data-cy="name"]').should('have.value', BASE);
  });
});
