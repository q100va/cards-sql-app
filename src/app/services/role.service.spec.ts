import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { RoleService } from './role.service';
import { environment } from '../../environments/environment';
import { MessageWrapperService } from './message.service';
import { of } from 'rxjs';
import { MonoTypeOperatorFunction, tap } from 'rxjs';

describe('RoleService', () => {
  let service: RoleService;
  let httpMock: HttpTestingController;
  let messageWrapperSpy: jasmine.SpyObj<MessageWrapperService>;
  const BASE_URL = `${environment.apiUrl}/api/roles`;

  beforeEach(() => {
    messageWrapperSpy = jasmine.createSpyObj('MessageWrapperService', [
      'messageTap',
      'handle',
    ]);

    // ВАЖНО: messageTap должен возвращать оператор (no-op)
    messageWrapperSpy.messageTap.and.callFake(
      (
        _severity?: any,
        _ctxOrFn?: any,
        _paramsOrFn?: any
      ): MonoTypeOperatorFunction<any> => {
        return (source$) => source$; // просто пропускаем дальше
      }
    );

    TestBed.configureTestingModule({
      providers: [
        RoleService,
        { provide: MessageWrapperService, useValue: messageWrapperSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(RoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------- checkRoleName ----------
  describe('checkRoleName', () => {
    it('returns true when role exists (happy path) and wires messageTap(warn, ...)', () => {
      const name = 'Admin';
      const mock = { data: true, code: 'ROLE.ALREADY_EXISTS' };

      service.checkRoleName(name).subscribe((res) => {
        expect(res.data).toBeTrue();
        // code может быть, но компоненту это не важно — проверка здесь не принципиальна
        expect(res.code).toBe('ROLE.ALREADY_EXISTS');
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-name/${encodeURIComponent(name)}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock);

      // Проверяем интеграцию с messageTap
      expect(messageWrapperSpy.messageTap).toHaveBeenCalled();
      const args = messageWrapperSpy.messageTap.calls.mostRecent().args;
      expect(args[0]).toBe('warn'); // severity
      // ctx мы передавали объект → либо сам объект, либо функция; у нас объект:
      expect(
        typeof args[1] === 'function' || typeof args[1] === 'object'
      ).toBeTrue();
      // params не передавали
      expect(args[2]).toBeUndefined();
    });

    it('encodes special characters in URL', () => {
      const name = 'Менеджер & Co/QA?';
      const mock = { data: false };

      service.checkRoleName(name).subscribe((res) => {
        expect(res.data).toBeFalse();
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
    it('creates role (happy path) and wires messageTap(success, params)', () => {
      const name = 'User';
      const description = 'Regular role';
      const mock = { data: 'User', code: 'ROLE.CREATED' };

      service.createRole(name, description).subscribe((res) => {
        expect(res.data).toBe('User');
        expect(res.code).toBe('ROLE.CREATED');
      });

      const req = httpMock.expectOne(`${BASE_URL}/create-role`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name, description });
      req.flush(mock);

      expect(messageWrapperSpy.messageTap).toHaveBeenCalled();
      const args = messageWrapperSpy.messageTap.calls.mostRecent().args;
      expect(args[0]).toBe('success');
      expect(typeof args[1]).toBe('undefined');
      expect(typeof args[2]).toBe('function');
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

    it('updates role (happy path) and wires messageTap(success, params)', () => {
      const mock = { data: role, code: 'ROLE.UPDATED' };

      service.updateRole(role as any).subscribe((res) => {
        expect(res.data).toEqual(role);
        expect(res.code).toBe('ROLE.UPDATED');
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(role);
      req.flush(mock);

      expect(messageWrapperSpy.messageTap).toHaveBeenCalled();
      const args = messageWrapperSpy.messageTap.calls.mostRecent().args;
      expect(args[0]).toBe('success');
      // ctx не передан
      expect(args[1]).toBeUndefined();
      // paramsFn должен быть function
      expect(typeof args[2]).toBe('function');
    });

    it('fails on wrong schema shape', () => {
      service.updateRole(role as any).subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('ERRORS.INVALID_SCHEMA'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      // Wrong shape (string instead of role object)
      req.flush({ data: 'oops', code: 'BAD' });
    });

    it('propagates HTTP error', () => {
      service.updateRole(role as any).subscribe({
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
      const mock = { data: { object: 'seniors', ops: [] } };

      service.updateRoleAccess(true, 2, op as any).subscribe((res) => {
        expect(res.data.object).toBe('seniors');
        expect(res.data.ops).toEqual([]);
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
          expect((err as Error).message).toBe('ERRORS.INVALID_SCHEMA'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/update-role-access`);
      // Invalid ops shape (id/roleId must be numbers)
      req.flush({
        data: { object: 'seniors', ops: [{ id: 'bad', roleId: 'nope' }] },
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
      const mock = { data: { roles, operations } };

      service.getRoles().subscribe((res) => {
        expect(res.data.roles).toEqual(roles);
        expect(res.data.operations).toEqual(operations);
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('fails on invalid schema (missing operations)', () => {
      service.getRoles().subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('ERRORS.INVALID_SCHEMA'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      req.flush({ data: { roles } }); // operations missing
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
      const mock = { data: [{ id: 1, name: 'Admin' }] };

      service.getRolesNamesList().subscribe((res) => {
        expect(res.data).toEqual([{ id: 1, name: 'Admin' }]);
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      expect(req.request.method).toBe('GET');
      req.flush(mock);
    });

    it('fails on invalid item shape', () => {
      service.getRolesNamesList().subscribe({
        next: () => fail('expected schema error'),
        error: (err) =>
          expect((err as Error).message).toBe('ERRORS.INVALID_SCHEMA'),
      });

      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      req.flush({ data: [{ id: '1', name: 2 }] });
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
    it('returns number of dependent users (happy path) and wires messageTap(warn, ctxFn, paramsFn)', () => {
      const id = 1;
      const mock = { data: 0 };

      service.checkPossibilityToDeleteRole(id).subscribe((res) => {
        expect(res.data).toBe(0);
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(String(id))}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock);

      expect(messageWrapperSpy.messageTap).toHaveBeenCalled();
      const args = messageWrapperSpy.messageTap.calls.mostRecent().args;
      expect(args[0]).toBe('warn');
      // ctx передаётся как функция (res)=>({...})
      expect(typeof args[1]).toBe('function');
      // paramsFn тоже функция: (res)=>({ count: res.data })
      expect(typeof args[2]).toBe('function');
    });

    it('fails when data is not a number (validator error)', () => {
      const id = 1;

      service.checkPossibilityToDeleteRole(id).subscribe({
        next: () => fail('expected validator error'),
        error: (err) =>
          expect((err as Error).message).toBe('ERRORS.INVALID_TYPE'),
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(String(id))}`
      );
      // Ошибочное значение типа
      req.flush({ data: 'not-a-number' });
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
    it('deletes a role (happy path) and wires messageTap(success)', () => {
      const id = 1;
      const mock = { data: null, code: 'ROLE.DELETED' };

      service.deleteRole(id).subscribe((res) => {
        expect(res.data).toBeNull();
        expect(res.code).toBe('ROLE.DELETED');
      });

      const req = httpMock.expectOne(
        `${BASE_URL}/delete-role/${encodeURIComponent(String(id))}`
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(mock);

      expect(messageWrapperSpy.messageTap).toHaveBeenCalled();
      const args = messageWrapperSpy.messageTap.calls.mostRecent().args;
      expect(args[0]).toBe('success');
      expect(args[1]).toBeUndefined(); // ctx?
      expect(args[2]).toBeUndefined(); // params?
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
