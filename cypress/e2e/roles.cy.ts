///  <reference types="cypress" />

/**
 * HOW TO RUN
 * Stubbed: npx cypress open --env USE_STUBS=1,API_URL=http://localhost:8080
 * Live:    npx cypress open --env USE_STUBS=0,API_URL=http://localhost:8080
 *
 * Требования для Live:
 *  - поднят сервер на тестовой БД (NODE_ENV=test)
 *  - есть эндпоинт POST /api/roles/create-role и GET /api/roles/get-roles
 *  - (опц.) cy.task('db:reset') настроен в cypress.config.ts
 */

const API_BASE = String(Cypress.env('API_URL') || 'http://localhost:8080');
const apiRoles = (p: string) => `${API_BASE}/api/roles${p}`;
const API = (p: string) => `**/api/roles${p}`;
const useStubs = () => String(Cypress.env('USE_STUBS')) === '1';
const maybe = (cond: boolean) => (cond ? it : it.skip);

function registerGetRolesRoute() {
  if (useStubs()) {
    // список/операции для страницы ролей
    cy.intercept('GET', API('/get-roles'), { fixture: 'roles-list.json' }).as(
      'getRoles'
    );
  } else {
    // spy без подмены
    cy.intercept('GET', API('/get-roles')).as('getRoles');
  }
}

/** LIVE: reset БД (если не отключён) и посев стартовых ролей */

type SeedRole = { name: string; description?: string };

function prepareLiveDB() {
  console.log('[cypress task] -> prepareLiveDB() ');
  const API_BASE = String(Cypress.env('API_URL') || 'http://localhost:8080');
  const apiRoles = (p: string) => `${API_BASE}/api/roles${p}`;

  return cy
    .task('db:reset', null, { timeout: 180_000, log: false })
    .should('eq', 'db-reset:done:v1');

}

describe('Roles — E2E (stubbed or live)', () => {
  before(() => {
    console.log(
      '[cypress task] -> useStubs()',
      String(Cypress.env('USE_STUBS'))
    );
    if (!useStubs()) {
      console.log('[cypress task] -> useStubs()', useStubs());
      // LIVE: чистая база и фиксированный сид для предсказуемости
      return prepareLiveDB();
    }
  });

  beforeEach(() => {
    registerGetRolesRoute();
    if (useStubs()) {
      cy.login();

    } else {
       cy.login({
        user: 'superAdmin',
        pass: 'p@ss12345',
      });
    }
    cy.get('button[data-cy="profileMenu"]')
      .scrollIntoView()
      .click({ force: true });
    cy.get('button[data-cy="nav-roles"]')
      .scrollIntoView()
      .click({ force: true });
    cy.location('pathname', { timeout: 10000 }).should('eq', '/roles');
    cy.wait('@getRoles', { timeout: 20000 });
    cy.get('p-table .p-datatable', { timeout: 10000 }).should('be.visible');
  });

  // ==== ОБЩИЕ СМУКИ ====
  it('renders page and can open/close Create dialog', () => {
    cy.get('button[data-cy="add-role-btn"]')
      .scrollIntoView()
      .click({ force: true });

    cy.get('[data-cy="dlg-role-name"]').should('be.visible');

    // Нажимаем Cancel в самом диалоге
    cy.get('[data-cy="dlg-cancel"]').click();

    // Ждём появления confirm (popup или dialog — покрываем оба случая)
    cy.get('.p-confirmdialog', { timeout: 5000 }).should('be.visible');

    // Жмём “Accept” (универсально по селекторам PrimeNG)
    cy.get('.p-confirmdialog-accept-button').first().click({ force: true });

    // Исходный диалог роли должен закрыться
    cy.get('[data-cy="dlg-role-name"]').should('not.exist');
  });

  // ==== INLINE RENAME (лучше в STUBBED, т.к. зависит от разметки данных) ====

  maybe(useStubs())(
    'inline rename: name is busy → rollback and no update call',
    () => {
      // 1) входим в режим редактирования
      cy.get('[data-cy="role-name-out-1"]')
        .should('be.visible')
        .click({ force: true });

      // 2) заранее ставим интерсепт на проверку имени
      cy.intercept('GET', API('/check-role-name/AdminNew'), {
        body: { data: true },
      }).as('checkBusy');

      // 3) редактируем
      cy.get('input[data-cy="role-name-1"]')
        .should('be.visible')
        .clear()
        .type('AdminNew')
        .blur();

      // 4) дождались ответа "занято"
      cy.wait('@checkBusy');

      // 5) имя ОТКАТИЛОСЬ в ИНПУТЕ (ячейка всё ещё в edit-режиме)
      cy.get('input[data-cy="role-name-1"]').should(
        'have.value',
        'Coordinator'
      );

      // 6) выходим из edit-режима (любой способ):
      // вариант A: клавиатура
      cy.get('input[data-cy="role-name-1"]').type('{esc}');
      // вариант B: кликнуть вне ячейки
      // cy.get('body').click(0, 0);

      // 7) теперь вернулся output-шаблон
      cy.get('[data-cy="role-name-out-1"]').should(
        'contain.text',
        'Coordinator'
      );

      // и не осталось активного инпута
      cy.get('input[data-cy="role-name-1"]').should('not.exist');
    }
  );
  maybe(useStubs())('inline rename: free name → PATCH and UI updates', () => {
    // войти в режим редактирования
    cy.get('[data-cy="role-name-out-1"]')
      .should('be.visible')
      .click({ force: true });

    // интерсепты ДО действий
    cy.intercept('GET', API('/check-role-name/NewCoordinator'), {
      body: { data: false },
    }).as('checkFree');

    cy.intercept('PATCH', API('/update-role'), (req) => {
      expect(req.body).to.include({ id: 1, name: 'NewCoordinator' });
      req.reply({
        body: {
          data: { id: 1, name: 'NewCoordinator', description: 'Coordinator' },
        },
      });
    }).as('updateRole');

    // изменить имя
    cy.get('input[data-cy="role-name-1"]')
      .should('be.visible')
      .clear()
      .type('NewCoordinator')
      .blur();

    // дождаться сетки
    cy.wait('@checkFree');
    cy.wait('@updateRole');

    // в инпуте уже новое значение
    cy.get('input[data-cy="role-name-1"]').should(
      'have.value',
      'NewCoordinator'
    );

    // выйти из режима редактирования (Enter/Esc или клик вне)
    cy.get('input[data-cy="role-name-1"]').type('{enter}');

    // теперь вернулся output и он обновлён
    cy.get('[data-cy="role-name-out-1"]').should(
      'contain.text',
      'NewCoordinator'
    );
  });

  maybe(useStubs())('inline description only → single PATCH', () => {
    let patchCount = 0;

    // ставим интерсепт ЗАРАНЕЕ
    cy.intercept('PATCH', API('/update-role'), (req) => {
      patchCount++;
      expect(req.body).to.include({
        id: 2,
        name: 'User',
        description: 'Helper',
      });
      req.reply({
        body: { data: { id: 2, name: 'User', description: 'Helper' } },
      });
    }).as('updateDesc');

    // входим в режим редактирования описания (output → input)
    cy.get('[data-cy="role-desc-out-2"]')
      .should('be.visible')
      .click({ force: true });

    // меняем значение в инпуте и триггерим blur (в компоненте это отправляет PATCH)
    cy.get('input[data-cy="role-desc-2"]')
      .should('be.visible')
      .clear()
      .type('Helper')
      .blur();

    // дожидаемся запроса и ответа
    cy.wait('@updateDesc');

    // убедимся, что PATCH был ровно один
    cy.wrap(null).then(() => {
      expect(patchCount).to.eq(1);
    });

    // значение в инпуте обновлено
    cy.get('input[data-cy="role-desc-2"]').should('have.value', 'Helper');

    // выходим из режима редактирования (Enter вернёт режим output)
    cy.get('input[data-cy="role-desc-2"]').type('{enter}');

    // проверяем, что показался output с обновлённым текстом
    cy.get('[data-cy="role-desc-out-2"]').should('contain.text', 'Helper');
  });

  // ==== DELETE (STUBBED): кликаем confirm-accept в PrimeNG ====
  maybe(useStubs())('delete: accept + allowed → DELETE and reload', () => {
    cy.intercept('GET', API('/check-role-before-delete/1'), {
      body: { data: 0 },
    }).as('canDelete');
    cy.intercept('DELETE', API('/delete-role/1'), { body: { data: null } }).as(
      'deleteRole'
    );
    cy.intercept('GET', API('/get-roles'), { fixture: 'roles-empty.json' }).as(
      'reload'
    );

    cy.get('[data-cy="delete-role-1"]').click();

    // появление диалога confirm → кликаем accept (кнопка PrimeNG)
    cy.get('.p-confirmdialog').should('be.visible');
    cy.get('.p-confirmdialog-accept-button').click();

    cy.wait('@canDelete');
    cy.wait('@deleteRole');
    cy.wait('@reload');

    cy.contains('Coordinator').should('not.exist');
  });

  // ==== CREATE (STUBBED) ====
  maybe(useStubs())('create: busy name → only GET check, no POST', () => {
    cy.get('[data-cy="add-role-btn"]').click();

    cy.get('[data-cy="dlg-role-name"]').clear().type('Coordinator');
    cy.get('[data-cy="dlg-role-desc"]').clear().type('Some desc');

    cy.intercept('GET', API('/check-role-name/Coordinator'), {
      body: { data: true },
    }).as('checkBusy');
    cy.intercept('POST', API('/create-role'), () => {
      throw new Error('Must not call create-role when name is busy');
    });

    cy.get('[data-cy="dlg-create"]').click();
    cy.wait('@checkBusy');

    cy.get('[data-cy="dlg-role-name"]').should('be.visible'); // диалог не закрылся
  });

  maybe(useStubs())(
    'create: free name → POST → dialog closes → list reloads',
    () => {
      // открыть диалог
      cy.get('[data-cy="add-role-btn"]').click();

      cy.get('[data-cy="dlg-role-name"]').clear().type('Editor');
      cy.get('[data-cy="dlg-role-desc"]').clear().type('Can edit');

      // 1) name свободно
      cy.intercept('GET', API('/check-role-name/Editor'), {
        statusCode: 200,
        body: { data: false },
      }).as('checkFree');

      // 2) успешный create
      cy.intercept('POST', API('/create-role'), {
        statusCode: 200,
        body: { data: 'Editor' },
      }).as('createRole');

      // 3) reload списка — вернём фикстуру + добавим Editor
      cy.fixture('roles-list.json').then((fx) => {
        const payload = JSON.parse(JSON.stringify(fx)); // deep clone
        payload.data.roles = [
          ...payload.data.roles,
          { id: 999, name: 'Editor', description: 'Can edit' },
        ];

        // перерегистрируем перехватчик на reload
        cy.intercept('GET', API('/get-roles'), payload).as('reload');
      });

      // отправка
      cy.get('[data-cy="dlg-create"]').click();

      // ждём цепочку сетевых событий
      cy.wait('@checkFree');
      cy.wait('@createRole');
      cy.wait('@reload');

      // диалог закрылся
      cy.get('[data-cy="dlg-role-name"]').should('not.exist');

      // новая роль появилась в таблице/разметке
      cy.contains('Editor').should('exist');
    }
  );

  // ==== TOGGLE ACCESS (только STUBBED: требует фиксированного набора operations) ====
  maybe(useStubs())('toggle access: merge only within same object', () => {
    cy.intercept('PATCH', API('/update-role-access'), (req) => {
      expect(req.body).to.deep.include({ roleId: 1 });
      req.reply({
        body: {
          data: {
            object: 'partners',
            ops: [{ id: 10, roleId: 1, access: true, disabled: true }],
          },
        },
      });
    }).as('toggleAccess');

    // Кликаем по НАТИВНОМУ инпуту внутри mat-checkbox
    cy.get(
      'mat-checkbox[data-cy="access-partners-role-1"] input[type="checkbox"]'
    )
      .should('exist')
      .check({ force: true });

    cy.wait('@toggleAccess');

    // Проверяем состояние — надёжнее по внутреннему input
    cy.get(
      'mat-checkbox[data-cy="access-partners-role-1"] input[type="checkbox"]'
    ).should('be.checked');

    cy.get(
      'mat-checkbox[data-cy="access-toponyms-role-1"] input[type="checkbox"]'
    ).should('not.be.checked');
  });

  // ==== LIVE-ONLY сценарии (проверки реальной валидации имени) ====
  maybe(!useStubs())(
    'LIVE: checkRoleName returns true for existing name (Coordinator)',
    () => {
      cy.get('button[data-cy="add-role-btn"]')
        .scrollIntoView()
        .click('center', { force: true });

      // cy.get('[data-cy="add-role-btn"]').click();
      cy.get('[data-cy="dlg-role-name"]').clear().type('Coordinator');
      cy.get('[data-cy="dlg-role-desc"]').clear().type('Live created');

      // spy — просто ждём реальный ответ
      cy.intercept('GET', API('/check-role-name/*')).as('check');
      cy.get('[data-cy="dlg-create"]').click();

      /*       cy.wait('@check').then(({ response }) => {
        expect(response?.statusCode).to.eq(200);
        expect(response?.body?.data).to.eq(true);
      }); */

      cy.wait('@check').then(({ response }) => {
        expect([200, 304]).to.include(response?.statusCode);
        if (response?.statusCode === 200) {
          expect(response?.body?.data).to.eq(true);
        }
      });

      //cy.wait('@check').its('res.data').should('eq', true);
      cy.get('[data-cy="dlg-role-name"]').should('be.visible'); // остаёмся в диалоге
    }
  );
  maybe(!useStubs())(
    'LIVE: create a unique role, dialog closes and appears in list',
    () => {
      const unique = `Role_${Date.now()}`;

      // 1) Открыть диалог и дождаться контейнера
      cy.get('button[data-cy="add-role-btn"]')
        .scrollIntoView()
        .click({ force: true });

      cy.get('.mat-mdc-dialog-container', { timeout: 10_000 }).should(
        'be.visible'
      );

      // 2) Вводим name с гарантией (фокус → clear → type → assert value)
      cy.get('[data-cy="dlg-role-name"]', { timeout: 10_000 })
        .should('be.visible')
        .click({ force: true })
        .clear({ force: true })
        .type(unique, { delay: 0, force: true })
        .should('have.value', unique);

      // 3) Вводим description с такой же гарантией
      cy.get('[data-cy="dlg-role-desc"]')
        .should('be.visible')
        .click({ force: true })
        .clear({ force: true })
        .type('Live created', { delay: 0, force: true })
        .should('have.value', 'Live created');

      // 4) Регистрируем перехваты ДО клика Create
      cy.intercept('GET', API('/check-role-name/*')).as('check');
      cy.intercept('POST', API('/create-role')).as('create');
      cy.intercept('GET', API('/get-roles')).as('reload');

      cy.get('[data-cy="dlg-create"]').click();

      // 5) Из-за ETag сервер может вернуть 304, поэтому не упираемся в 200
      cy.wait('@check').then(({ response }) => {
        expect([200, 304]).to.include(response?.statusCode);
        if (response?.statusCode === 200) {
          expect(response?.body?.data).to.eq(false);
        }
      });

      cy.wait('@create')
        .its('response.statusCode')
        .should('be.oneOf', [200, 201]);
      cy.wait('@reload');

      cy.get('[data-cy="dlg-role-name"]').should('not.exist');
      cy.contains(unique).should('exist');
    }
  );
});
