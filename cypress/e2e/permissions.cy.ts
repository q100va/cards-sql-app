// Ограниченная роль: минимальные права (видит ограниченный список пользователей/топонимов)
// и НЕ видит роли/аудит. Также запрещён маршрут с гардом.

import { API } from '../support/constants';
import type { z } from 'zod';
import type { usersSchema } from '../../shared/schemas/user.schema';

type UsersFixture = { data: z.input<typeof usersSchema> };

function stubPermissionsLimited() {
  // Возвращаем минимально достаточный набор прав
  const PERMS = [
    { id: 1, roleId: 999, operation: 'VIEW_LIMITED_USERS_LIST', access: true, disabled: false },
    { id: 2, roleId: 999, operation: 'VIEW_LIMITED_TOPONYMS_LIST', access: true, disabled: false },
    { id: 3, roleId: 999, operation: 'VIEW_FULL_ROLES_LIST', access: false, disabled: false },
    { id: 4, roleId: 999, operation: 'ALL_OPS_ROLES', access: false, disabled: false },
    // actions
    { id: 5, roleId: 999, operation: 'ADD_NEW_USER', access: false, disabled: false },
    { id: 6, roleId: 999, operation: 'EDIT_USER', access: false, disabled: false },
    { id: 7, roleId: 999, operation: 'DELETE_USER', access: false, disabled: false },
    { id: 8, roleId: 999, operation: 'ADD_NEW_ROLE', access: false, disabled: false },
    { id: 9, roleId: 999, operation: 'EDIT_ROLE', access: false, disabled: false },
    { id: 10, roleId: 999, operation: 'DELETE_ROLE', access: false, disabled: false },
  ];

  cy.intercept('GET', `${API}/auth/permissions`, {
    statusCode: 200,
    body: { data: PERMS },
  }).as('perms');
}

describe('Limited role — navigation & guards', () => {
  beforeEach(() => {
    stubPermissionsLimited();
    cy.login({ user: 'LIMITED_USER', pass: 'LIMITED_PASS', viaApi: true, noVisit: true });
  });

it('Menu: only allowed items are visible; admin-only items are hidden', () => {
    cy.visit('/');

    // Дождёмся загрузки прав
    cy.wait('@perms');

    // Открыть выпадающее меню профиля
    cy.get('button[data-cy="profileMenu"]').click();

    // Видим то, что положено
    cy.get('button[data-cy="nav-users"]').should('exist');
    cy.get('button[data-cy="nav-toponyms"]').should('exist');

    // Не видим админских пунктов
    cy.get('button[data-cy="nav-roles"]').should('not.exist');
    cy.get('button[data-cy="nav-audit"]').should('not.exist');
  });

  it('Guarded route: navigating to forbidden page lands on /forbidden', () => {
    cy.visit('/audit');
    cy.location('pathname').should('eq', '/forbidden');
  });

 it('Users list: "Create" button is hidden without ADD_NEW_USER', () => {
    cy.wait('@usersList');
    cy.visit('/users');
    cy.wait('@perms').its('response.statusCode').should('eq', 200);
    cy.wait('@usersList').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', '/users');
    cy.get('app-users-list table[mat-table]').should('be.visible');
    cy.get('app-users-list .overlay').should('not.exist');
    cy.get('app-users-list button[data-cy="btn-create-item"]').should('not.exist');
  });
});

// Админ: все нужные пункты меню видны, страницы открываются,
// кнопки действий соответствуют правам (в т.ч. create/edit/delete)

function stubPermissionsAdmin() {
  const PERMS = [
    { id: 10, roleId: 999, operation: 'ALL_OPS_ROLES', access: true, disabled: false },

    // просмотр
    { id: 1, roleId: 999, operation: 'VIEW_FULL_USERS_LIST', access: true, disabled: false },
    { id: 2, roleId: 999, operation: 'VIEW_FULL_TOPONYMS_LIST', access: true, disabled: false },
    { id: 3, roleId: 999, operation: 'VIEW_FULL_ROLES_LIST', access: true, disabled: false },
    { id: 11, roleId: 999, operation: 'VIEW_AUDIT_LOG', access: true, disabled: false },

    // users
    { id: 4, roleId: 999, operation: 'ADD_NEW_USER', access: true, disabled: false },
    { id: 5, roleId: 999, operation: 'EDIT_USER', access: true, disabled: false },
    { id: 6, roleId: 999, operation: 'DELETE_USER', access: true, disabled: false },

    // roles
    { id: 7, roleId: 999, operation: 'ADD_NEW_ROLE', access: true, disabled: false },
    { id: 8, roleId: 999, operation: 'EDIT_ROLE', access: true, disabled: false },
    { id: 9, roleId: 999, operation: 'DELETE_ROLE', access: true, disabled: false },
  ];

  cy.intercept('GET', `${API}/auth/permissions`, {
    statusCode: 200,
    body: { data: PERMS },
  }).as('perms');
}

describe('Admin — navigation & actions', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/roles/get-roles`, { fixture: 'roles-list.json' }).as('getRoles');
    stubPermissionsAdmin();
    cy.login({ user: 'ADMIN_USER', pass: 'ADMIN_PASS', viaApi: true, noVisit: true });
  });

  it('Menu: all main items are visible', () => {
    cy.visit('/');
    cy.wait('@perms');

    cy.get('[data-cy="profileMenu"]').click();

    cy.get('[data-cy="nav-users"]').should('exist');
    cy.get('[data-cy="nav-toponyms"]').should('exist');
    cy.get('[data-cy="nav-roles"]').should('exist');
    cy.get('[data-cy="nav-audit"]').should('exist');
  });

  it('Roles page opens; action buttons match permissions', () => {
    cy.visit('/roles');
    cy.wait('@perms').its('response.statusCode').should('eq', 200);
    cy.wait('@getRoles').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', '/roles');
    cy.get('p-table .p-datatable').should('be.visible');
    cy.get('button[data-cy="add-role-btn"]').should('exist');
    cy.get('button[data-cy="delete-role-1"]').should('be.visible');
    cy.get('[data-cy="role-name-out-1"]').click();
    cy.get('input[data-cy="role-name-1"]').should('be.visible').and('not.be.disabled');
    cy.get('input[data-cy="role-name-1"]').type('{esc}');
    cy.get('[data-cy="role-name-out-1"]').should('contain.text', 'Coordinator');
  });

  it('Users page: action buttons visible with proper rights', () => {
    cy.intercept('POST', `${API}/users/get-users`, { fixture: 'users-permissions.json' }).as('permissionUsers');
    cy.fixture<UsersFixture>('users-permissions.json').then((fixture) => {
      cy.intercept('GET', `${API}/users/get-user-by-id/71`, { body: { data: fixture.data.list[0] } }).as('permissionUser');
    });
    cy.visitApp('/users');
    cy.wait('@perms').its('response.statusCode').should('eq', 200);
    cy.wait('@permissionUsers').its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('eq', '/users');
    cy.get('app-users-list .overlay').should('not.exist');
    cy.contains('app-users-list tr.mat-mdc-row', 'permission-fixture').as('userRow');
    cy.get('button[data-cy="btn-create-item"]').should('exist');
    cy.get('@userRow').find('td.mat-column-actions button').click();
    cy.contains('button.mat-mdc-menu-item span', /^delete$/).should('be.visible');
    cy.contains('button.mat-mdc-menu-item', 'open card').click();
    cy.wait('@permissionUser').its('response.body.data.id').should('eq', 71);
    cy.get('.mat-mdc-dialog-container button[title="Edit"]').should('be.visible').and('not.be.disabled');
  });
});


// Проверяем перехватчик:
//  - 401 → вызывает refresh и ретраит запрос
//  - 403 → не приводит к логауту/редиректу



function stubPermissions() {
  const PERMS = [
    { id: 1, roleId: 999, operation: 'VIEW_FULL_USERS_LIST', access: true, disabled: false },
    { id: 2, roleId: 999, operation: 'VIEW_FULL_ROLES_LIST', access: true, disabled: false },
    { id: 3, roleId: 999, operation: 'ALL_OPS_ROLES', access: true, disabled: false },
  ];
  cy.intercept('GET', `${API}/auth/permissions`, { statusCode: 200, body: { data: PERMS } }).as('perms');
}

describe('Auth flows — 401 refresh retry & 403 no logout', () => {
  beforeEach(() => {
    stubPermissions();
    cy.login({ user: 'ADMIN_USER', pass: 'ADMIN_PASS', viaApi: true, noVisit: true });
  });

  it('401 → refresh → retry succeeds; no redirect to /session/sign-in', () => {
    // Complete hydration first so its refresh cannot satisfy recovery assertions.
    cy.wait('@usersList');
    cy.visitApp('/users');
    cy.wait('@perms');
    cy.wait('@usersList');
    cy.get('app-users-list table[mat-table]').should('be.visible');
    cy.get('app-users-list .overlay').should('not.exist');

    const events: string[] = [];
    let calls = 0;
    cy.fixture<UsersFixture>('users-permissions.json').then((fixture) => {
      cy.intercept('POST', `${API}/users/get-users`, (req) => {
        expect(req.body.sort).to.deep.eq([{ field: 'userName', direction: 'asc' }]);
        expect(req.body.page.number).to.eq(0);
        calls++;
        expect(calls, 'exactly one failed request and one retry').to.be.at.most(2);
        if (calls === 1) {
          expect(req.headers.authorization).to.eq('Bearer tok_ref_1234567890');
          events.push('protected:401');
          req.reply({ statusCode: 401, body: { code: 'ERRORS.UNAUTHORIZED' } });
        } else {
          expect(events).to.deep.eq(['protected:401', 'refresh:200']);
          expect(req.headers.authorization).to.eq('Bearer acc_new_token');
          events.push('retry:200');
          req.reply({ statusCode: 200, body: fixture });
        }
      }).as('protected');
    });
    cy.intercept('POST', `${API}/session/refresh`, (req) => {
      expect(events).to.deep.eq(['protected:401']);
      events.push('refresh:200');
      req.reply({ statusCode: 200, body: { data: { accessToken: 'acc_new_token', expiresIn: 900 } } });
    }).as('refresh');

    cy.get('app-users-list th.mat-column-userName').click();
    cy.wait('@protected').its('response.statusCode').should('eq', 401);
    cy.wait('@refresh').its('response.statusCode').should('eq', 200);
    cy.wait('@protected').then(({ request, response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.data.list[0].userName).to.eq('permission-fixture');
      expect(request.headers.authorization).to.eq('Bearer acc_new_token');
    });
    cy.contains('app-users-list td.mat-column-userName', 'permission-fixture').should('be.visible');
    cy.wrap(null).then(() => {
      expect(events).to.deep.eq(['protected:401', 'refresh:200', 'retry:200']);
      expect(calls).to.eq(2);
    });
    cy.location('pathname').should('eq', '/users');
    cy.location('pathname').should('not.eq', '/session/sign-in');
  });

  it('403 is propagated (no logout); user stays on page', () => {
    cy.wait('@usersList');
    cy.visitApp('/users');
    cy.wait('@perms');
    cy.wait('@usersList');
    cy.get('app-users-list table[mat-table]').should('be.visible');
    cy.get('app-users-list .overlay').should('not.exist');

    let calls = 0;
    let refreshCalls = 0;
    cy.intercept('POST', `${API}/session/refresh`, () => {
      refreshCalls++;
      throw new Error('403 must not refresh the session');
    });
    cy.fixture<UsersFixture>('users-permissions.json').then((fixture) => {
      cy.intercept('POST', `${API}/users/get-users`, (req) => {
        calls++;
        expect(calls).to.be.at.most(2);
        expect(req.headers.authorization).to.eq('Bearer tok_ref_1234567890');
        expect(req.body.sort).to.deep.eq([{ field: 'userName', direction: calls === 1 ? 'asc' : 'desc' }]);
        req.reply(calls === 1 ? { statusCode: 403, body: { code: 'ERRORS.FORBIDDEN' } }
          : { statusCode: 200, body: fixture });
      }).as('protected403');
    });
    cy.get('app-users-list th.mat-column-userName').click();
    cy.wait('@protected403').then(({ response }) => {
      expect(response?.statusCode).to.eq(403);
      expect(response?.body.code).to.eq('ERRORS.FORBIDDEN');
    });
    cy.contains('p-toast .ui-toast-warn', 'Not enough permissions.').should('be.visible');
    cy.location('pathname').should('eq', '/users');
    cy.location('pathname').should('not.eq', '/session/sign-in');
    cy.get('app-users-list .overlay').should('not.exist');
    cy.get('app-users-list th.mat-column-userName').click();
    cy.wait('@protected403').its('response.statusCode').should('eq', 200);
    cy.contains('app-users-list td.mat-column-userName', 'permission-fixture').should('be.visible');
    cy.wrap(null).then(() => {
      expect(refreshCalls).to.eq(0);
      expect(calls).to.eq(2);
    });
    cy.location('pathname').should('eq', '/users');
  });
});

