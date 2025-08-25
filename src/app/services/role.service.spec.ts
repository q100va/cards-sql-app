import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { RoleService } from './role.service';
import { environment } from '../../environments/environment';

describe('RoleService', () => {
  let service: RoleService;
  let httpMock: HttpTestingController;
  const BASE_URL = `${environment.apiUrl}/api/roles`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RoleService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------- checkRoleName ----------
  describe('checkRoleName', () => {
    it('returns true when role exists (happy path)', () => {
      const name = 'Admin';
      const mock = { data: true, msg: 'ok' };

      service.checkRoleName(name).subscribe((res) => {
        expect(res.data).toBeTrue();
        expect(res.msg).toBe('ok');
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-name/${encodeURIComponent(name)}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('encodes special characters in URL', () => {
      const name = 'Менеджер & Co/QA?';
      const mock = { data: true, msg: 'ok' };

      service.checkRoleName(name).subscribe((res) => {
        expect(res.data).toBeTrue();
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-name/${encodeURIComponent(name)}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('propagates HTTP error', () => {
      const name = 'Unknown';
      service.checkRoleName(name).subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => {
          expect(err.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-name/${encodeURIComponent(name)}`
      );
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ---------- createRole ----------
  describe('createRole', () => {
    it('creates role (happy path)', () => {
      const name = 'User';
      const description = 'Regular role';
      const mock = { data: 'User', msg: 'Created' };

      service.createRole(name, description).subscribe((res) => {
        expect(res.data).toBe('User');
        expect(res.msg).toBe('Created');
      });

      const req = httpMock.expectOne(`${BASE_URL}/create-role`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name, description });
      req.flush(mock);
    });

    it('propagates HTTP error', () => {
      service.createRole('User', 'Desc').subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(500),
      });

      const req = httpMock.expectOne(`${BASE_URL}/create-role`);
      req.flush('Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });
  });

  // ---------- updateRole ----------
  describe('updateRole', () => {
    const role = { id: 1, name: 'Admin', description: 'Administrator' };

    it('updates role (happy path)', () => {
      const mock = { data: role, msg: 'Updated' };

      service.updateRole(role).subscribe((res) => {
        expect(res.data).toEqual(role);
        expect(res.msg).toBe('Updated');
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(role);
      req.flush(mock);
    });

    it('fails on wrong schema shape', () => {
      service.updateRole(role).subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('Неверный формат данных ответа.'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      // Wrong shape (string instead of role object)
      req.flush({ data: 'oops', msg: 'bad' });
    });

    it('propagates HTTP error', () => {
      service.updateRole(role).subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(400),
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  // ---------- updateRoleAccess ----------
  describe('updateRoleAccess', () => {
    const op = {
      description: 'desc',
      accessToAllOps: true,
      object: 'seniors',
      objectName: 'жители\nинтернатов',
      operation: 'ALL_OPS_SENIORS',
      operationName: 'полный доступ ко всем операциям',
      rolesAccesses: [
        { id: 42, roleId: 1, access: true, disabled: false },
        { id: 93, roleId: 2, access: true, disabled: false },
      ],
    };

    it('updates role access (happy path)', () => {
      const mock = { data: { object: 'seniors', ops: [] }, msg: 'OK' };

      service.updateRoleAccess(true, 2, op as any).subscribe((res) => {
        expect(res.data.object).toBe('seniors');
        expect(res.data.ops).toEqual([]);
        expect(res.msg).toBe('OK');
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role-access`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        access: true,
        roleId: 2,
        operation: op,
      });
      req.flush(mock);
    });

    it('fails on invalid roleAccesses schema', () => {
      service.updateRoleAccess(true, 2, op as any).subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('Неверный формат данных ответа.'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role-access`);
      // Invalid ops shape (id/roleId must be numbers)
      req.flush({
        data: { object: 'seniors', ops: [{ id: 'bad', roleId: 'nope' }] },
        msg: 'bad',
      });
    });

    it('propagates HTTP error', () => {
      service.updateRoleAccess(false, 2, op as any).subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(403),
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role-access`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  // ---------- getRoles ----------
  describe('getRoles', () => {
    const roles = [
      { id: 1, name: 'Admin', description: 'Administrator' },
      { id: 2, name: 'User', description: 'Regular user' },
    ];
    const operations = [
      {
        description: 'desc',
        accessToAllOps: true,
        object: 'seniors',
        objectName: 'жители\nинтернатов',
        operation: 'ALL_OPS_SENIORS',
        operationName: 'полный доступ ко всем операциям',
        rolesAccesses: [
          { id: 42, roleId: 1, access: true, disabled: false },
          { id: 93, roleId: 2, access: true, disabled: false },
        ],
      },
    ];

    it('returns roles + operations (happy path)', () => {
      const mock = { data: { roles, operations }, msg: 'Fetched' };

      service.getRoles().subscribe((res) => {
        expect(res.data.roles).toEqual(roles);
        expect(res.data.operations).toEqual(operations);
        expect(res.msg).toBe('Fetched');
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('fails on invalid schema (missing operations)', () => {
      service.getRoles().subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('Неверный формат данных ответа.'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      req.flush({ data: { roles }, msg: 'bad' }); // operations missing
    });

    it('propagates HTTP error', () => {
      service.getRoles().subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(500),
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });
  });

  // ---------- getRolesNamesList ----------
  describe('getRolesNamesList', () => {
    it('returns id/name pairs (happy path)', () => {
      const mock = { data: [{ id: 1, name: 'Admin' }], msg: 'OK' };

      service.getRolesNamesList().subscribe((res) => {
        expect(res.data).toEqual([{ id: 1, name: 'Admin' }]);
        expect(res.msg).toBe('OK');
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('fails on invalid item shape', () => {
      service.getRolesNamesList().subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('Неверный формат данных ответа.'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      req.flush({ data: [{ id: '1', name: 2 }], msg: 'bad' });
    });

    it('propagates HTTP error', () => {
      service.getRolesNamesList().subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(404),
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ---------- checkPossibilityToDeleteRole ----------
  describe('checkPossibilityToDeleteRole', () => {
    it('returns usernames string or empty (happy path)', () => {
      const id = 1;
      const mock = { data: '', msg: 'OK' };

      service.checkPossibilityToDeleteRole(id).subscribe((res) => {
        expect(res.data).toBe('');
        expect(res.msg).toBe('OK');
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(String(id))}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('fails when data is not a string (validator error)', () => {
      const id = 1;

      service.checkPossibilityToDeleteRole(id).subscribe({
        next: () => fail('expected validator error'),
        error: (err) =>
          expect((err as Error).message).toBe('Неверный тип данных ответа.'),
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(String(id))}`
      );
      req.flush({ data: 123, msg: 'bad' }); // expects string
    });

    it('propagates HTTP error', () => {
      const id = 5;

      service.checkPossibilityToDeleteRole(id).subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(400),
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(String(id))}`
      );
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });

  // ---------- deleteRole ----------
  describe('deleteRole', () => {
    it('deletes a role (happy path)', () => {
      const id = 1;
      const mock = { data: true, msg: 'Deleted' };

      service.deleteRole(id).subscribe((res) => {
        expect(res.data).toBeTrue();
        expect(res.msg).toBe('Deleted');
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/delete-role/${encodeURIComponent(String(id))}`
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(mock);
    });

    it('propagates HTTP error', () => {
      const id = 2;

      service.deleteRole(id).subscribe({
        next: () => fail('expected error'),
        error: (err: HttpErrorResponse) => expect(err.status).toBe(500),
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/delete-role/${encodeURIComponent(String(id))}`
      );
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });

    it('propagates network error (no status)', () => {
      const id = 7;

      service.deleteRole(id).subscribe({
        next: () => fail('expected network error'),
        error: (err: HttpErrorResponse) =>
          expect(err.statusText).toBe('Unknown Error'),
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/delete-role/${encodeURIComponent(String(id))}`
      );
      req.error(new ProgressEvent('error')); // simulate network error
    });
  });
});
