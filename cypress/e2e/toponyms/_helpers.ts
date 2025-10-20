// cypress/e2e/toponyms/_helpers.ts
export const API_URL = String(Cypress.env('API_URL') || 'http://localhost:8080');

function authHeaders() {
  const token: string | undefined = Cypress.env('ACCESS_TOKEN');
  const base = { 'x-lang': 'en' } as Record<string, string>;
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
}

/** Логин и сохранение access-токена из /sign-in (без refresh) */
export function apiLogin(opts: { user: string; pass: string }) {
  return cy
    .request({
      method: 'POST',
      url: `${API_URL}/api/session/sign-in`,
      body: { userName: opts.user, password: opts.pass },
    })
    .its('body')
    .then((b) => {
      const token = b?.data?.token as string | undefined;
      expect(token, 'token from /sign-in').to.be.a('string').and.not.empty;
      Cypress.env('ACCESS_TOKEN', token);
      return token!;
    });
}

/** Получить первый доступный countryId (или вернуть указанное) */
export function resolveCountryId(preferred?: number) {
  if (preferred != null) return cy.wrap(preferred);
  return cy
    .request({
      method: 'GET',
      url: `${API_URL}/api/toponyms/get-toponyms-list`,
      qs: { typeOfToponym: 'countries' },
      headers: authHeaders(),
    })
    .its('body.data')
    .then((list: Array<{ id: number; name: string }>) => {
      expect(list, 'countries list').to.be.an('array').and.not.empty;
      console.log(list[0].id)
      return list[0].id; // реальный id из БД
    });
}

export function createRegion(payload: {
  name: string;
  shortName?: string;
  countryId?: number; // опционально — если не задан, возьмём реальный
}) {
  return resolveCountryId(payload.countryId).then((countryId) =>
    cy
      .request({
        method: 'POST',
        url: `${API_URL}/api/toponyms/create-toponym`,
        headers: authHeaders(),
        body: {
          type: 'region',
          name: payload.name,
          shortName: payload.shortName ?? payload.name,
          countryId,
        },
      })
      .its('body')
      .then((b) => {b.data})
  );
}

export function deleteRegion(id: number) {
  return cy
    .request({
      method: 'DELETE',
      url: `${API_URL}/api/toponyms/delete-toponym`,
      headers: authHeaders(),
      qs: { id, type: 'region', destroy: true },
      failOnStatusCode: false, // на случай, если уже удалён
    })
    .its('status')
    .should('be.oneOf', [200, 204, 404]); // 404 — ок для финализации
}
