import type { Toponym } from '../../../shared/schemas/toponym.schema';

export type ToponymFixtures = {
  regions: { list: { data: { toponyms: Toponym[]; length: number } } };
  countriesList: { data: { id: number; name: string }[] };
};

export function expectRegionOrder(names: string[]) {
  cy.get('[data-cy="row"] td.mat-column-name').should(($cells) => {
    expect([...$cells].map((cell) => cell.textContent?.trim())).to.deep.eq(names);
  });
}

export function checkRegionSort(ascending: string[], descending: string[], search = '') {
  const header = '[data-cy="table"] th.mat-column-name';
  cy.get('[data-cy="table"]').should('be.visible');
  expectRegionOrder(ascending);
  // The first click selects the already-applied ascending default; no reload is needed.
  cy.get(header).click().should('have.attr', 'aria-sort', 'ascending');
  expectRegionOrder(ascending);
  cy.get(header).click().should('have.attr', 'aria-sort', 'descending');
  cy.wait('@list').then(({ request, response }) => {
    expect(request.method).to.eq('GET');
    expect(request.query).to.include({ type: 'region', search, sortBy: 'name', sortDir: 'desc', page: '0', pageSize: '10', countries: '143' });
    expect(response?.statusCode).to.eq(200);
  });
  expectRegionOrder(descending);
  // Clearing MatSort restores the service's ascending fallback.
  cy.get(header).click().should('have.attr', 'aria-sort', 'none');
  cy.wait('@list').then(({ request, response }) => {
    expect(request.query).to.include({ type: 'region', search, sortBy: 'name', sortDir: 'asc', page: '0', pageSize: '10', countries: '143' });
    expect(response?.statusCode).to.eq(200);
  });
  expectRegionOrder(ascending);
}
