// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';



beforeEach(() => {
  cy.document().then((doc) => {
    const style = doc.createElement('style');
    style.innerHTML = `
      *,
      *::before,
      *::after { transition: none !important; animation: none !important; }
      .cdk-overlay-container, .cdk-overlay-pane, .mat-mdc-dialog-container { transition: none !important; animation: none !important; opacity: 1 !important; transform: none !important; }
    `;
    doc.head.appendChild(style);
  });
});
