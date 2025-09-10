// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// cypress/support/commands.ts

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', () => {
  console.log('[cypress task] login → start');
  // 1) сначала загрузим домен, чтобы можно было ставить cookie для него
  cy.visit('/');

  // 2) ставим cookie, как это сделал бы backend после логина
  cy.setCookie('session_user', 'okskust' /* ,{
    path: '/',
    sameSite: 'lax',      // подстрой если нужно
    //domain: 'localhost',
    httpOnly: false,      // если ваша cookie НЕ httpOnly (иначе из теста её не поставить)
  } */);

  // 3) положим что-то в sessionStorage (если ваше приложение это читает)
  cy.window().then((win) => {
    win.sessionStorage.setItem('name', 'Оксана Кустова');
  });
});

export {};
