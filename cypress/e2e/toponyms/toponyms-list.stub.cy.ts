/// <reference types="cypress" />

import { API } from '../../support/constants';
import { checkRegionSort, type ToponymFixtures } from './_assertions';
import type { Interception } from 'cypress/types/net-stubbing';

const as = (alias: string) => ({ as: alias });

// fixture
const fxToponyms = () => cy.fixture('toponyms.json');

// minimal perms to see Regions page
function stubPermissionsForToponyms() {
  const PERMS = [
    {
      id: 7,
      roleId: 999,
      operation: 'VIEW_LIMITED_USERS_LIST',
      access: true,
      disabled: false,
    },
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
  cy.fixture<ToponymFixtures>('toponyms.json').then((f) => {
    let rows = [...f.regions.list.data.toponyms];
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
        data: rows.map((r) => ({
          id: r.id,
          name: r.name,
          countryId: r.defaultAddressParams!.countryId,
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
      const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      if (req.query.sortDir === 'desc') sorted.reverse();
      req.reply({ data: { toponyms: sorted, length: sorted.length } });
    }).as('list');

    // delete flow
    cy.intercept('GET', '**/api/toponyms/check-toponym-before-delete*', {
      data: 0,
    }).as('checkCanDelete');
    cy.intercept('DELETE', '**/api/toponyms/delete*', (req) => {
      expect(req.query).to.include({ type: 'region', id: '101', destroy: 'true' });
      rows = rows.filter((row) => row.id !== 101);
      req.reply({ statusCode: 200, body: { data: null } });
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

    // Permissions for guard
    stubPermissionsForToponyms();

    // Stubbed login (your custom command)
    cy.login({ noVisit: true });

    // Enter app, let guards resolve
    cy.visitApp('/');
    cy.location('pathname', { timeout: Cypress.config('pageLoadTimeout') }).should('eq', '/users');
    cy.get('app-users-list table[mat-table]', { timeout: Cypress.config('pageLoadTimeout') }).should('be.visible');
    cy.get('app-users-list .overlay').should('not.exist');
    cy.wait('@perms').its('response.statusCode').should('eq', 200);

    // Navigate via header/menu (as your app expects)
    cy.get('button[data-cy="profileMenu"]')
      .scrollIntoView()
      .should('be.visible').click();
    cy.get('button[data-cy="nav-toponyms"]')
      .scrollIntoView()
      .should('be.visible').click();
    cy.get('button[data-cy="nav-regions"]')
      .scrollIntoView()
      .should('be.visible').click();

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
      expect(req.query).to.include({ type: 'region', search: 'елка', exact: 'false', page: '0', countries: '143' });
      req.reply({ data: { toponyms: [], length: 0 } });
    }).as('searchToponyms');

    const sel = '[data-cy="search-input"]';
    cy.get(sel).should('exist').closest('mat-form-field').find('label').click();
    cy.get(sel).should('be.focused')
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
    checkRegionSort(['Тверская', 'Тульская'], ['Тульская', 'Тверская']);
  });

  it('opens details card via row menu', () => {
    cy.intercept({ method: 'GET', pathname: '/api/toponyms/get-toponyms-list', query: { typeOfToponym: 'districts', ids: '101' } }, {
      statusCode: 200, body: { data: [] },
    }).as('cardDistricts');
    cy.contains('[data-cy="row"]', 'Тверская').find('[data-cy="open-menu-actions"]').click();
    cy.get('[data-cy="open-card"]').click();
    cy.wait('@getToponymById').then(({ request, response }) => {
      expect(new URL(request.url).pathname).to.eq('/api/toponyms/get-region-by-id/101');
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data).to.include({ id: 101, name: 'Тверская' });
    });
    cy.get('.mat-mdc-dialog-container').should('be.visible');
    cy.get('.mat-mdc-dialog-container .overlay').should('not.exist');
    cy.get<Interception[]>('@cardDistricts.all').should((calls) => {
      const completed = calls.filter((call) => call.response?.statusCode === 200);
      expect(completed.length, 'at least one completed card hierarchy request').to.be.greaterThan(0);
      calls.forEach((call) => expect(call.request.query).to.include({ typeOfToponym: 'districts', ids: '101' }));
      completed.forEach((call) => expect(call.response?.body.data).to.deep.eq([]));
    });
    cy.get('.mat-mdc-dialog-container input[data-cy="name"]').should('have.value', 'Тверская');
    cy.get('.mat-mdc-dialog-container button[title="Close"]').click();
    cy.get('.mat-mdc-dialog-container').should('not.exist');
  });

  it('delete flow (accept) calls check + delete + table reload', () => {
    cy.contains('[data-cy="row"]', 'Тверская').find('[data-cy="open-menu-actions"]').click();
    cy.get('[data-cy="open-menu-delete"]').click();
    cy.get('[data-cy="delete"]').click();
    cy.get('.p-confirmdialog-accept-button').click();

    cy.wait('@checkCanDelete').then(({ request, response }) => {
      expect(request.query).to.include({ type: 'region', id: '101', destroy: 'true' });
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data).to.eq(0);
    });
    cy.wait('@deleteToponym').then(({ request, response }) => {
      expect(request.method).to.eq('DELETE');
      expect(request.query).to.include({ type: 'region', id: '101', destroy: 'true' });
      expect(response?.statusCode).to.eq(200);
    });
    cy.wait('@list').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data.toponyms.map((row: { id: number }) => row.id)).to.deep.eq([102]);
    });
    cy.get('table[mat-table] tbody tr').should('exist');
    cy.contains('[data-cy="row"]', 'Тверская').should('not.exist');
    cy.contains('[data-cy="row"]', 'Тульская').should('be.visible');
    cy.get('[data-cy="row"]').should('have.length', 1);
  });

  it('download template saves the HTTP Blob with the expected filename and bytes', () => {
    cy.fixture<{ filename: string; contentType: string; contentBase64: string }>('template-regions-download.json').then((file) => {
      let objectUrl: sinon.SinonSpy<(Blob | MediaSource)[], string>;
      let dispatch: sinon.SinonSpy<Event[], boolean>;
      cy.intercept('GET', `${API}/files/download/template-regions.xlsx`, {
        statusCode: 200,
        headers: { 'content-type': file.contentType, 'content-disposition': `attachment; filename="${file.filename}"` },
        body: Uint8Array.from(Cypress.Buffer.from(file.contentBase64, 'base64')).buffer,
      }).as('downloadTemplate');
      cy.window().then((win) => {
        objectUrl = cy.spy(win.URL, 'createObjectURL');
        dispatch = cy.spy(win.HTMLAnchorElement.prototype, 'dispatchEvent');
      });
      cy.get('button[data-cy="download-template"]').should('be.visible').click();
      cy.wait('@downloadTemplate').then(({ request, response }) => {
        expect(request.method).to.eq('GET');
        expect(new URL(request.url).pathname).to.eq('/api/files/download/template-regions.xlsx');
        expect(response?.statusCode).to.eq(200);
        expect(response?.headers['content-type']).to.eq(file.contentType);
      });
      cy.wrap(null).should(() => {
        expect(objectUrl).to.have.been.calledOnce;
        const clicks = dispatch.getCalls().filter((call) => call.args[0].type === 'click');
        expect(clicks, 'saveAs must dispatch a download anchor click').to.have.length(1);
        const anchor = clicks[0].thisValue as HTMLAnchorElement;
        expect(anchor.download).to.eq(file.filename);
        expect(anchor.href).to.eq(objectUrl.firstCall.returnValue);
        expect(anchor.href).to.match(/^blob:/);
      });
      cy.then(() => {
        const blob = objectUrl.firstCall.args[0];
        expect(blob).to.have.property('type', file.contentType);
        if (!('arrayBuffer' in blob)) throw new Error('Expected an HTTP Blob download');
        return blob.arrayBuffer();
      }).then((bytes) => {
        expect(Cypress.Buffer.from(bytes).toString('base64')).to.eq(file.contentBase64);
      });
    });
  });

  it('clearing country disables Region; reselecting Russia reloads and enables it', () => {
    const country = 'mat-select[formcontrolname="country"]';
    const region = 'mat-select[formcontrolname="region"]';
    cy.get(country).should('contain.text', 'Россия');
    cy.get(region).should('not.have.class', 'mat-mdc-select-disabled').and('have.attr', 'aria-disabled', 'false');
    cy.get(country).click();
    cy.get('.mat-mdc-select-panel mat-option').filter((_, option) => !option.textContent?.trim())
      .should('have.length', 1).click();
    cy.wait('@list').then(({ request, response }) => {
      expect(request.query.type).to.eq('region');
      expect(request.query).not.to.have.property('countries');
      expect(request.query).not.to.have.property('regions');
      expect(response?.statusCode).to.eq(200);
    });
    cy.get(country).find('.mat-mdc-select-value-text').should('not.exist');
    cy.get(region).should('have.class', 'mat-mdc-select-disabled').and('have.attr', 'aria-disabled', 'true');
    cy.get(region).find('.mat-mdc-select-value-text').should('not.exist');

    cy.get(country).click();
    cy.contains('.mat-mdc-select-panel mat-option', /^\s*Россия\s*$/).click();
    cy.wait('@regionsOfCountry').then(({ request, response }) => {
      expect(request.query).to.include({ typeOfToponym: 'regions', ids: '143' });
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data.map((row: { id: number }) => row.id)).to.deep.eq([101, 102]);
    });
    cy.wait('@list').then(({ request, response }) => {
      expect(request.query).to.include({ type: 'region', countries: '143' });
      expect(response?.statusCode).to.eq(200);
    });
    cy.get(country).should('contain.text', 'Россия');
    cy.get(region).should('not.have.class', 'mat-mdc-select-disabled').and('have.attr', 'aria-disabled', 'false');
    cy.get(region).click();
    cy.get('.mat-mdc-select-panel mat-option .mdc-list-item__primary-text').should(($options) => {
      expect([...$options].map((option) => option.textContent?.trim())).to.deep.eq(['', 'Тверская', 'Тульская']);
    });
    cy.get('body').type('{esc}');
  });
});
