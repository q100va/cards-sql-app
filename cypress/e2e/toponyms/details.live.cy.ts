/// <reference types="cypress" />
import { apiLogin, createRegion, deleteRegion } from './_helpers';
const UNIQUE = `e2e-region-${Date.now()}`;
const EDITED = `e2e-details-${Date.now()}-edited`;
const BASE = `e2e-details-${Date.now()}-edited-again`;

describe('Toponyms (live): Region details dialog', () => {
  let id: number;

  before(() => {
    cy.task('db:reset', null, { timeout: 180_000, log: false }).should(
      'eq',
      'db-reset:done:v1'
    );

    // login via API → ACCESS_TOKEN
    apiLogin({ user: 'superAdmin', pass: 'p@ss12345' }).then(() =>
      createRegion({ name: UNIQUE }).then((r) => {
        id = r.id;
      })
    );
  });

  after(() => {
    if (id) deleteRegion(id);
  });

  beforeEach(() => {
    cy.login();
    cy.visitApp('/regions');
  });

  it('justSave keeps dialog open and switches to view', () => {
    // register dialog-level traffic BEFORE actions
    cy.intercept('GET', '**/api/toponyms/get-toponyms-list*', (req) => {
      const q = req.query || {};
      if (q.typeOfToponym === 'countries') req.alias = 'dlgCountries';
      if (q.typeOfToponym === 'regions') req.alias = 'dlgRegions';
      if (q.typeOfToponym === 'districts') req.alias = 'dlgDistricts';
    });
    cy.intercept('GET', '**/api/toponyms/check-toponym-name*').as('checkName');

    // open card via row menu
    cy.get('button[data-cy="open-menu-actions"], button[matMenuTriggerFor]')
      .first()
      .click({ force: true });
    cy.contains('button, .mat-mdc-menu-item', /open.*card/i).click({
      force: true,
    });

    cy.get('.mat-mdc-dialog-container', { timeout: 10000 }).should(
      'be.visible'
    );

    // wait for countries to load at least once (dialog boot)
    cy.wait('@dlgCountries', { timeout: 20000 });

    // optional: if regions list is requested on boot, wait for it too
    cy.wait('@dlgRegions', { timeout: 20000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201, 304]);
    // wait until the overlay inside the dialog is gone (the form is ready)
    cy.get('.mat-mdc-dialog-container .overlay', { timeout: 20000 }).should(
      'not.exist'
    );

    // switch to edit
    cy.contains('button[title],button', /edit/i).click({ force: true });

    // CRITICAL: ensure country select is rendered with a value (text shows "Россия")
    // This guarantees form controls (including countryId) are set before Save.
    cy.get('.mat-mdc-dialog-container')
      .should('be.visible')
      .within(() => {
        cy.get(
          'mat-select[formControlName="country"] .mat-mdc-select-value-text',
          { timeout: 10000 }
        )
          .should('be.visible')
          .and(($t) => {
            // accept any casing/locale
            expect($t.text().toLowerCase()).to.include('россия');
          });
      });

    // tiny stabilization; avoids flake on immediate save after render
    cy.wait(150);

    // edit name and Save (justSave path)
    cy.get('input[data-cy="name"]').type(`{selectall}${EDITED}`, {
      force: true,
    });
    cy.contains('button[title],button', /^save$/i).click({ force: true });

    // assert that server got countryId in query
    cy.wait('@checkName', { timeout: 20000 }).then(({ request }) => {
      const q = request.query || {};
      expect(String(q.countryId), 'countryId in check-toponym-name').to.match(
        /^\d+$/
      );
    });

    // dialog stays open (justSave) and is back in view
    cy.get('.mat-mdc-dialog-container').should('be.visible');
    cy.contains('button[title],button', /edit/i).should('exist');
  });

  it('saveAndExit closes dialog', () => {
    // register dialog-level traffic BEFORE actions
    cy.intercept('GET', '**/api/toponyms/get-toponyms-list*', (req) => {
      const q = req.query || {};
      if (q.typeOfToponym === 'countries') req.alias = 'dlgCountries';
      if (q.typeOfToponym === 'regions') req.alias = 'dlgRegions';
      if (q.typeOfToponym === 'districts') req.alias = 'dlgDistricts';
    });
    cy.intercept('GET', '**/api/toponyms/check-toponym-name*').as('checkName');

    // open card via row menu
    cy.get('button[data-cy="open-menu-actions"], button[matMenuTriggerFor]')
      .first()
      .click({ force: true });
    cy.contains('button, .mat-mdc-menu-item', /open.*card/i).click({
      force: true,
    });

    cy.get('.mat-mdc-dialog-container', { timeout: 10000 }).should(
      'be.visible'
    );

    // wait for countries to load at least once (dialog boot)
    cy.wait('@dlgCountries', { timeout: 20000 });

    // optional: if regions list is requested on boot, wait for it too
    cy.wait('@dlgRegions', { timeout: 20000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201, 304]);
    // wait until the overlay inside the dialog is gone (the form is ready)
    cy.get('.mat-mdc-dialog-container .overlay', { timeout: 20000 }).should(
      'not.exist'
    );

    // switch to edit
    cy.contains('button[title],button', /edit/i).click({ force: true });

    // CRITICAL: ensure country select is rendered with a value (text shows "Россия")
    // This guarantees form controls (including countryId) are set before Save.
    cy.get('.mat-mdc-dialog-container')
      .should('be.visible')
      .within(() => {
        cy.get(
          'mat-select[formControlName="country"] .mat-mdc-select-value-text',
          { timeout: 10000 }
        )
          .should('be.visible')
          .and(($t) => {
            // accept any casing/locale
            expect($t.text().toLowerCase()).to.include('россия');
          });
      });

    // tiny stabilization; avoids flake on immediate save after render
    cy.wait(150);

    cy.get('input[data-cy="name"]').type('{selectall}' + BASE, {
      force: true,
    });
    cy.contains('button', /save.*exit/i).click({ force: true });

    cy.get('.mat-mdc-dialog-container').should('not.exist');
  });
});
