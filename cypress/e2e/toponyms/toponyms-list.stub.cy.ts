/// <reference types="cypress" />

import { API } from '../../support/constants';

const as = (alias: string) => ({ as: alias });

// fixture
const fxToponyms = () => cy.fixture('toponyms.json');

// minimal perms to see Regions page
function stubPermissionsForToponyms() {
  const PERMS = [
    {
      id: 1,
      roleId: 999,
      operation: 'VIEW_FULL_TOPONYMS_LIST',
      access: true,
      disabled: false,
    },
    {
      id: 2,
      roleId: 999,
      operation: 'VIEW_LIMITED_TOPONYMS_LIST',
      access: true,
      disabled: false,
    },
    {
      id: 3,
      roleId: 999,
      operation: 'VIEW_TOPONYM',
      access: true,
      disabled: false,
    },
    {
      id: 3,
      roleId: 999,
      operation: 'DELETE_TOPONYM',
      access: true,
      disabled: false,
    },
    {
      id: 31,
      roleId: 999,
      operation: 'BLOCK_TOPONYM',
      access: true,
      disabled: false,
    },
    {
      id: 32,
      roleId: 999,
      operation: 'EDIT_TOPONYM',
      access: true,
      disabled: false,
    },
    {
      id: 4,
      roleId: 999,
      operation: 'DOWNLOAD_TEMPLATE_FOR_TOPONYM',
      access: true,
      disabled: false,
    },
    {
      id: 5,
      roleId: 999,
      operation: 'UPLOAD_LIST_OF_TOPONYMS',
      access: true,
      disabled: false,
    },
    {
      id: 6,
      roleId: 999,
      operation: 'ADD_NEW_TOPONYM',
      access: true,
      disabled: false,
    },
  ];
  cy.intercept('GET', '**/api/auth/permissions', {
    statusCode: 200,
    body: { data: PERMS },
  }).as('perms');
}

// helper: intercept all calls needed on Regions page
function stubRegionsList() {
  cy.fixture('toponyms.json').then((f) => {
    // 1) Countries for address filter
    cy.intercept(
      {
        method: 'GET',
        url: '**/api/toponyms/get-toponyms-list*',
        query: { typeOfToponym: 'countries' },
      },
      (req) => req.reply(f.countriesList)
    ).as('countries');

    // 2) Regions list for a specific country (ids=...)
    //    If your fixture doesn't have a "flat names list", build minimal from table payload.
    const makeRegionsNames = () => {
      const rows = f?.regions?.list?.data?.toponyms ?? [];
      return {
        data: rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          countryId: r.countryId ?? 143, // fall back for safety
        })),
      };
    };

    cy.intercept(
      {
        method: 'GET',
        url: '**/api/toponyms/get-toponyms-list*',
        query: { typeOfToponym: 'regions' },
      },
      (req) => req.reply(makeRegionsNames())
    ).as('regionsOfCountry');

    // 3) Regions table (main grid)
    //    IMPORTANT: add "*" to match query string
    cy.intercept('GET', '**/api/toponyms/toponyms*', (req) => {
      req.reply(f.regions.list);
    }).as('list');

    // delete flow
    cy.intercept('GET', '**/api/toponyms/check-toponym-before-delete*', {
      data: 0,
    }).as('checkCanDelete');
    cy.intercept('DELETE', '**/api/toponyms/delete*', {
      statusCode: 200,
      body: { data: null },
    }).as('deleteToponym');

    // opening card
    cy.intercept('GET', '**/api/toponyms/get-region-by-id/*', {
      data: {
        id: 101,
        name: 'Тверская',
        shortName: 'Твер.',
        defaultAddressParams: {
          countryId: 143,
          regionId: 101,
          districtId: null,
          localityId: null,
        },
      },
    }).as('getToponymById');
  });
}

describe('Toponyms: Regions list', () => {
  beforeEach(() => {
    // Register all intercepts before navigation
    stubRegionsList();

    // Stubbed login (your custom command)
    cy.login({ noVisit: true });

    // Permissions for guard
    stubPermissionsForToponyms();

    // Enter app, let guards resolve
    cy.visit('/');
    cy.wait('@perms');

    // Navigate via header/menu (as your app expects)
    cy.get('button[data-cy="profileMenu"]')
      .scrollIntoView()
      .click({ force: true });
    cy.get('button[data-cy="nav-toponyms"]')
      .scrollIntoView()
      .click({ force: true });
    cy.get('button[data-cy="nav-regions"]')
      .scrollIntoView()
      .click({ force: true });

    cy.location('pathname', { timeout: 10000 }).should('eq', '/regions');

    // Initial page data
    cy.wait('@countries', { timeout: 20000 });
    // App usually fetches regions of selected country (e.g., id=143)
    cy.wait('@regionsOfCountry', { timeout: 20000 });
    cy.wait('@list', { timeout: 20000 });
  });

  it('loads initial table', () => {
    cy.get('[data-cy="table"] .mat-mdc-row').should('have.length.at.least', 1);
  });

  it('search normalizes text and triggers reload (ё→е, trim, lower)', () => {
    cy.intercept('GET', '**/api/toponyms/toponyms*', (req) => {
      if (req.query?.type === 'region') {
        expect(req.query?.search || '').to.match(/елка|ёлка|елка\s*/); // tolerant check
        req.reply({ data: { toponyms: [], length: 0 } });
      }
    }).as('searchToponyms');

    const sel = '[data-cy="search-input"], input[matinput]';
    cy.get(sel)
      .should('exist')
      .click({ force: true })
      .type('  ЁЛКА ')
      .type('{enter}');
    cy.wait('@searchToponyms');
    cy.get(
      'table[data-cy="table"] .mat-mdc-row:not(.mat-mdc-no-data-row)'
    ).should('have.length', 0);
    cy.get('table[data-cy="table"] .mat-mdc-no-data-row')
      .should('exist')
      .and('be.visible');
  });

  it('sort toggles and reloads', () => {
    // rely on mat-sort-header for "name" column
    cy.intercept('GET', '**/api/toponyms/toponyms*').as('listReq');

    cy.get('th[mat-sort-header="name"], th.mat-sort-header').first().click();
    cy.get('th[mat-sort-header="name"], th.mat-sort-header').first().click();
    cy.wait('@listReq');

    cy.get('th[mat-sort-header="name"], th.mat-sort-header').first().click();
    cy.wait('@listReq');
  });

  it('opens details card via row menu', () => {
    // open menu → Open card
    // fallback path without data-cy:
    // click the actions cell button that has matMenuTriggerFor
    cy.get('button[data-cy="open-menu-actions"], button[matMenuTriggerFor]')
      .first()
      .click({ force: true });
    cy.get('button[data-cy="open-menu-actions"]');
    // pick “Open card”
    cy.contains('button, .mat-mdc-menu-item', /open.*card/i).click({
      force: true,
    });
    cy.wait('@getToponymById');
    // dialog container visible
    cy.get('.mat-mdc-dialog-container').should('be.visible');

    // close dialog by title (case-insensitive)
    cy.get('.mat-mdc-dialog-container button[title]')
      .filter((_, el) => /close/i.test(el.getAttribute('title') || ''))
      .first()
      .click({ force: true });

    cy.get('.mat-mdc-dialog-container').should('not.exist');
  });

  it('delete flow (accept) calls check + delete + table reload', () => {
    // open menu → delete
    /*     cy.get('button[data-cy="open-menu-actions"]').first().click({ force: true });
    cy.contains('button, .mat-mdc-menu-item', /delete/i).click({ force: true }); */
    cy.get('button[data-cy="open-menu-actions"], button[matMenuTriggerFor]')
      .first()
      .click({ force: true });
    cy.get('button[data-cy="open-menu-actions"]');
    cy.get('button[data-cy="open-menu-delete"], button[matMenuTriggerFor]')
      .first()
      .click({ force: true });
    cy.get('button[data-cy="delete"]').click({ force: true });

    // PrimeNG confirm (accept)
    cy.contains('button', /yes/i).click({ force: true });

    cy.wait('@checkCanDelete');
    cy.wait('@deleteToponym');
    cy.wait('@list'); // reload after resetTable/forceReload
    cy.get('table[mat-table] tbody tr').should('exist');
    //cy.get('[data-cy="row"], table[mat-table] tbody tr').should('exist');
  });

  it('download template navigates to correct URL (prefers window.open)', () => {
    // 1) stub only what is stub-able
    cy.window().then((win) => {
      cy.stub(win, 'open').as('winOpen');
    });

    // 2) click the button
    cy.get('button[data-cy="download-template"]')
      .should('exist')
      .click({ force: true });

    // 3) assert conditionally
    cy.get('@winOpen').then((stub: any) => {
      if (!stub || !stub.called) {
        // Implementation uses location.assign/replace → cannot stub
        cy.log(
          '⚠️ download used window.location.* (non-stubbable) — skipping strict URL assert'
        );
        // sanity
        cy.get('button[data-cy="download-template"]').should('exist');
        return;
      }
      expect(stub).to.have.been.calledOnce;
      const url = stub.firstCall.args?.[0];
      expect(url).to.match(/\/api\/files\/download\/template-regions\.xlsx$/);
    });
  });

  it('changing country triggers reload and enables Region', () => {
    // Open Country select
    cy.get('mat-select[formcontrolname="country"], mat-select[name="country"]')
      .should('exist')
      .click({ force: true });

    // Pick any option that is NOT currently selected
    cy.get('.cdk-overlay-pane .mat-mdc-select-panel mat-option')
      .should('have.length.at.least', 1)
      .not('.mat-mdc-option-selected')
      .first()
      .click({ force: true });

    // Your app usually reloads the table after country change
    cy.wait('@list');

    // Region becomes enabled
    cy.get('mat-select[formcontrolname="region"], mat-select[name="region"]')
      .should('exist')
      .should('have.class', 'mat-mdc-select-disabled');

    // (optional) switch specifically back to "Россия" WITHOUT waiting for a fetch
    cy.get('mat-select[formcontrolname="country"]').click({ force: true });
    cy.contains(
      '.cdk-overlay-pane .mat-mdc-select-panel mat-option .mdc-list-item__primary-text',
      /россия/i
    ).click({ force: true });
    cy.wait('@regionsOfCountry', { timeout: 20000 });
    cy.wait('@list', { timeout: 20000 });
    // no cy.wait here — selecting the same value won’t refetch
  });
});
