/// <reference types="cypress" />
import { checkRegionSort, type ToponymFixtures } from './_assertions';

// fixture
const fxToponyms = () => cy.fixture<ToponymFixtures>('toponyms.json');

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

// countries + regions API stubs
function stubRegionsData() {
  fxToponyms().then((f) => {
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
      const rows = [...f.regions.list.data.toponyms].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      if (req.query.sortDir === 'desc') rows.reverse();
      req.reply({ data: { toponyms: rows, length: rows.length } });
    }).as('list');
  });
}

describe('Toponyms (stub): Regions list', () => {
  beforeEach(() => {
    // Register all intercepts before navigation
    stubRegionsData();

    // Permissions for guard
    stubPermissionsForToponyms();

    // Stubbed login (your custom command)
    cy.login({ noVisit: true });

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

  it('loads table', () => {
    cy.get('[data-cy="table"] .mat-mdc-row').should('have.length.at.least', 1);
  });

  it('sort triggers reload', () => {
    checkRegionSort(['Тверская', 'Тульская'], ['Тульская', 'Тверская']);
  });
});
