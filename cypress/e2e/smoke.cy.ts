describe('app smoke', () => {
  it('boots Angular shell', () => {
    cy.visit('/');
    cy.get('app-root').should('exist');
    cy.get('html')
      .should('have.attr', 'lang')
      .and('match', /(en|ru)/);
  });

  it('roles page renders table (stubbed API)', () => {
    cy.login(); // пропускаем guard

    // 1) Стаб get-roles (любая схема/хост/квери)

    cy.intercept('GET', '**/api/roles/get-roles*', {
      statusCode: 200,
      body: {
        data: {
          roles: [{ id: 1, name: 'Admin', description: 'Admin role' }],
          operations: [
            {
              operation: 'ADD_NEW_PARTNER',
              description: 'Add new partner',
              object: 'partners',
              objectName: 'partners',
              operationName: 'add',
              accessToAllOps: false,
              rolesAccesses: [
                { id: 10, roleId: 1, access: false, disabled: false },
              ],
            },
          ],
        },
      },
    }).as('getRoles');

    // 2) Если хочешь видеть все API — только через console.log
    cy.intercept('GET', '**/api/**', (req) => {
      // НЕ cy.log — только console.log!
      console.log('API →', req.url);
    }).as('anyApi');

    // 3) Открываем страницу
    cy.visit('/roles');

    // 4) Ждём стаб и проверяем таблицу
    cy.wait('@getRoles', { timeout: 10000 });
    cy.get('p-table, [data-cy="roles-table"]').should('exist');
  });
});
