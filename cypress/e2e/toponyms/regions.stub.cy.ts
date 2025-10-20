/// <reference types="cypress" />

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
  });
}

describe('Toponyms (stub): Regions list', () => {
  beforeEach(() => {
    // Register all intercepts before navigation
    stubRegionsData();

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

  it('loads table', () => {
    cy.get('[data-cy="table"] .mat-mdc-row').should('have.length.at.least', 1);
  });

  it('sort triggers reload', () => {
    // Catch any GET under /api/toponyms/** and alias only table reload calls
cy.intercept('GET', '**/api/toponyms/toponyms*').as('list2');

    // Ensure table is visible before clicking
    cy.get('[data-cy="table"]').should('be.visible');

    // Click first sortable header (forces event even if overlay was there)
    cy.get('th[mat-sort-header]')
      .first()
      .scrollIntoView()
      .click({ force: true });
    cy.get('th[mat-sort-header]')
      .first()
      .click({ force: true })
      .click({ force: true });
    // Wait for the aliased table reload
    cy.wait('@list2', { timeout: 15000 }).then(({ request, response }) => {
      expect(request.method).to.eq('GET');
      expect(response?.statusCode).to.be.oneOf([200, 201]);
    });
  });
});
