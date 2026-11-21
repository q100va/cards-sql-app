/// <reference types="cypress" />

import { apiLogin, createRegion, deleteRegion } from './_helpers';
const UNIQUE = `e2e-region-${Date.now()}`;
const USERS = {
  Viewer: {
    user: 'viewerUser',
    pass: 'p@ss54321',
  },
  /*   EDITOR: {
    user: Cypress.env('U_EDITOR') || 'editor',
    pass: Cypress.env('P_EDITOR') || 'p@ss',
  }, */
  Admin: {
    user: Cypress.env('U_Admin') || 'superAdmin',
    pass: Cypress.env('P_Admin') || 'p@ss12345',
  },
};

function visitRegionsAs(role: keyof typeof USERS, createdId: number) {
  cy.login({ user: USERS[role].user, pass: USERS[role].pass });
  cy.intercept('GET', '**/api/auth/permissions').as('getPerms');
  cy.visit('/');
  //cy.wait('@getPerms');
  cy.wait('@getPerms', { log: false }).then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
    //expect(interception.response!.statusCode).to.equal(200); // убедитесь, что ответ корректен
  });
  cy.get('button[data-cy="profileMenu"]').click();
  cy.get('button[data-cy="nav-toponyms"]').click();
  cy.get('button[data-cy="nav-regions"]').click();
  cy.visitApp('/regions');
  cy.contains('mat-card-title, h1, h2', /regions/i, { timeout: 10000 }).should(
    'be.visible'
  );
  cy.intercept('GET', '**/api/toponyms/toponyms*', (req) => {
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];
    if (req.query.search === UNIQUE) req.alias = 'ownedPermissionRegion';
  });
  cy.get('[data-cy="table"]').should('be.visible');
  cy.get('app-toponyms-list .overlay').should('not.exist');
  cy.get('[data-cy="search-input"]').should('be.visible').focus().clear().type(`${UNIQUE}{enter}`);
  cy.wait('@ownedPermissionRegion').then(({ request, response }) => {
    expect(request.query).to.include({ type: 'region', search: UNIQUE, countries: '143' });
    expect(response?.statusCode).to.eq(200);
    expect(response?.body.data.toponyms.map((region: { id: number }) => region.id)).to.deep.eq([createdId]);
  });
  cy.get('[data-cy="row"]').should('have.length', 1).and('contain.text', UNIQUE);
}

describe('Toponyms (live): permissions', () => {
  let createdId: number | null = null;
  before(() => {
    cy.task('db:reset', null, { timeout: 180_000, log: false }).should(
      'eq',
      'db-reset:done:v1'
    );

    // login via API → ACCESS_TOKEN
    apiLogin({ user: 'superAdmin', pass: 'p@ss12345' }).then(() =>
      createRegion({ name: UNIQUE, countryId: 143 }).then((region) => {
        expect(Number.isSafeInteger(region.id)).to.eq(true);
        expect(region.id).to.be.greaterThan(0);
        createdId = region.id;
      })
    );
  });
  after(() => {
    if (createdId !== null) return deleteRegion(createdId).then(() => { createdId = null; });
  });
  (['Viewer', 'Admin'] as const).forEach((role) => {
    it(`${role}: UI capability checks`, () => {
      expect(createdId).to.be.a('number').and.be.greaterThan(0);
      visitRegionsAs(role, createdId!);

      const canAdd = role !== 'Viewer';
      // const canEdit = role !== 'Viewer';
      const canDelete = role === 'Admin';

      cy.get('button[data-cy="add-toponym"]').should(
        canAdd ? 'exist' : 'not.exist'
      );
      /*
            cy.contains('button mat-icon', 'add_location_alt')
        .closest('button')
        .should(canAdd ? 'exist' : 'not.exist'); */

      // === Delete — в меню строки ===
      // Open actions only for the fixture verified by ID above.
      cy.contains('[data-cy="row"]', UNIQUE)
        .find('button[data-cy="open-menu-actions"]')
        .click();

      // 2) сам пункт "удаление" — это верхний level, который триггерит подменю причин
      //    у тебя есть data-cy="open-menu-delete"
      cy.get('button[data-cy="open-menu-delete"]')
        .should(canDelete ? 'exist' : 'not.exist')
        .then(($btn) => {
          if (!canDelete) return; // для Viewer дальше не идём

          // 3) открыть подменю причин удаления
          cy.wrap($btn).click();

          // 4) конечная кнопка удаления (reason = "created by mistake") — data-cy="delete"
          cy.get('button[data-cy="delete"]').should('exist');
        });

      // Add button presence (icon or tooltip/title)
      cy.get('button')
        .filter((_, el) => {
          const title = (el as HTMLButtonElement).title?.toLowerCase() ?? '';
          const icon = el.querySelector('mat-icon')?.textContent ?? '';
          return title.includes('add') || icon.includes('add_location_alt');
        })
        .should(canAdd ? 'exist' : 'not.exist');

      // Delete visible anywhere (menu item)
      cy.contains('.mat-mdc-menu-item,button', /delete/i).should(
        canDelete ? 'exist' : 'not.exist'
      );
    });
  });
});
