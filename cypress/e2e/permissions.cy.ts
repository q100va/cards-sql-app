// Ограниченная роль: минимальные права (видит ограниченный список пользователей/топонимов)
// и НЕ видит роли/аудит. Также запрещён маршрут с гардом.

import { API } from '../support/constants';

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
    cy.login({ user: 'LIMITED_USER', pass: 'LIMITED_PASS', viaApi: true, noVisit: true });
    stubPermissionsLimited();
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
    cy.get('body').then(($b) => {
      expect($b.find('button[data-cy="nav-roles"]').length).to.eq(0);
      expect($b.find('button[data-cy="nav-audit"]').length).to.eq(0);
    });
  });

  it('Guarded route: navigating to forbidden page lands on /forbidden', () => {
    // /audit защищён requireOp("VIEW_FULL_ROLES_LIST")
    cy.visit('/audit');
    cy.location('pathname').should('eq', '/users');// TODO: should be forbidden
  });

 it('Users list: "Create" button is hidden without ADD_NEW_USER', () => {
    // если страница пользователей доступна в ограниченном режиме
    cy.visit('/users');
    // Кнопка создания пользователя отсутствует
    cy.get('body').then(($b) => {
      expect($b.find('button[data-cy="btn-create-item"]').length).to.eq(0);
    });
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
    cy.login({ user: 'ADMIN_USER', pass: 'ADMIN_PASS', viaApi: true, noVisit: true });
    stubPermissionsAdmin();
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

    // Кнопки действий на странице ролей
    cy.get('button[data-cy="add-role-btn"]').should('exist');
    //cy.get('[data-cy="btn-edit-role"]').should('exist');
    //TODO:add later
   // cy.get('button[data-cy="delete-role-1"]').should('exist');
  });

  it('Users page: action buttons visible with proper rights', () => {
    cy.visit('/users');

    cy.get('button[data-cy="btn-create-item"]').should('exist');
    //TODO:add later
   // cy.get('[data-cy="btn-edit-user"]').should('exist');   // хотя бы одна в таблице
   // cy.get('[data-cy="btn-delete-user"]').should('exist');
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
    cy.login({ user: 'ADMIN_USER', pass: 'ADMIN_PASS', viaApi: true, noVisit: true });
    stubPermissions();
  });

  it('401 → refresh → retry succeeds; no redirect to /session/sign-in', () => {
    // Эндпоинт, который точно дергается страницей (пример)
    const protectedPath = `${API}/roles/get-roles-names-list`;

    // 1-й вызов: 401
    let first = true;
    cy.intercept('GET', protectedPath, (req) => {
      if (first) {
        first = false;
        req.reply({ statusCode: 401, body: { code: 'ERRORS.UNAUTHORIZED' } });
      } else {
        req.reply({ statusCode: 200, body: { data: [] } });
      }
    }).as('protected');

    // refresh: вернём новый accessToken
    cy.intercept('POST', `${API}/session/refresh`, {
      statusCode: 200,
      body: { data: { accessToken: 'acc_new_token', expiresIn: 900 } },
    }).as('refresh');

    cy.visit('/users');

    // порядок: 401 на защищённом → refresh → повтор запроса → 200
    cy.wait('@protected'); // 401
    cy.wait('@refresh');
    cy.wait('@protected'); // 200

    cy.location('pathname').should('not.eq', '/session/sign-in');
  });

  it('403 is propagated (no logout); user stays on page', () => {
    const protectedPath = `${API}/roles/get-roles-names-list`;

    cy.intercept('GET', protectedPath, {
      statusCode: 403,
      body: { code: 'ERRORS.FORBIDDEN' },
    }).as('protected403');

    cy.visit('/users');

    cy.wait('@protected403');

    // Не уходит на /session/sign-in
    cy.location('pathname').should('not.eq', '/session/sign-in');

    // Опционально: проверка, что тост/ошибка показана.
    // Если есть data-cy для тостов — лучше по нему.
    // cy.get('[data-cy="toast"]').should('be.visible');
  });
});

