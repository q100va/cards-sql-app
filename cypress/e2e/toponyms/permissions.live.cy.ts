/// <reference types="cypress" />

import { apiLogin, createRegion } from './_helpers';
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

function visitRegionsAs(role: keyof typeof USERS) {
  cy.login({ user: USERS[role].user, pass: USERS[role].pass });
  cy.intercept('GET', '**/api/auth/permissions').as('getPerms');
  cy.visit('/');
  //cy.wait('@getPerms');
  cy.wait('@getPerms').then((interception) => {
    console.log('Permissions:', interception.response!.body);
    //expect(interception.response!.statusCode).to.equal(200); // убедитесь, что ответ корректен
  });
  cy.get('button[data-cy="profileMenu"]').click({ force: true });
  cy.get('button[data-cy="nav-toponyms"]').click({ force: true });
  cy.get('button[data-cy="nav-regions"]').click({ force: true });
  cy.visitApp('/regions');
  cy.contains('mat-card-title, h1, h2', /regions/i, { timeout: 10000 }).should(
    'be.visible'
  );
}

describe('Toponyms (live): permissions', () => {
  before(() => {
    cy.task('db:reset', null, { timeout: 180_000, log: false }).should(
      'eq',
      'db-reset:done:v1'
    );

    // login via API → ACCESS_TOKEN
    apiLogin({ user: 'superAdmin', pass: 'p@ss12345' }).then(() =>
      createRegion({ name: UNIQUE })
    );
  });
  (['Viewer', 'Admin'] as const).forEach((role) => {
    it(`${role}: UI capability checks`, () => {
      visitRegionsAs(role);

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
      // 1) открыть меню действий первой строки (у тебя есть data-cy="open-menu-actions")
      cy.get('button[data-cy="open-menu-actions"]')
        .first()
        .click({ force: true });

      // 2) сам пункт "удаление" — это верхний level, который триггерит подменю причин
      //    у тебя есть data-cy="open-menu-delete"
      cy.get('button[data-cy="open-menu-delete"]')
        .should(canDelete ? 'exist' : 'not.exist')
        .then(($btn) => {
          if (!canDelete) return; // для Viewer дальше не идём

          // 3) открыть подменю причин удаления
          cy.wrap($btn).click({ force: true });

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
