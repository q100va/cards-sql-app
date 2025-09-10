import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';

import { RoleService } from './role.service';
import { LanguageService } from '../services/language.service'; // adjust path if needed
import { environment } from '../../environments/environment';
import { TestBed } from '@angular/core/testing';
import { MessageWrapperService } from './message.service';
import { Injectable } from '@angular/core';

@Injectable()
class LangHeaderInterceptor implements HttpInterceptor {
  constructor(private lang: LanguageService) {}
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    // В твоём сервисе есть только геттер .current
    const code = this.lang?.current ?? 'en';
    return next.handle(req.clone({ setHeaders: { 'x-lang': code } }));
  }
}

describe('RoleService (integration)', () => {
  let svc: RoleService;
  let http: HttpTestingController;
  const BASE = `${environment.apiUrl}/api/roles`;

  const msgStub = {
    handle: jasmine.createSpy('handle'),
    warn: jasmine.createSpy('warn'),
    messageTap:
      () =>
      (src$: any): any =>
        src$,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // HttpClient + тестовый backend
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),

        RoleService,

        // Стаб LanguageService с нужным полем `current`
        { provide: LanguageService, useValue: { current: 'uk' } },

        // Подключаем интерсептор через DI
        { provide: HTTP_INTERCEPTORS, useClass: LangHeaderInterceptor, multi: true },

        { provide: MessageWrapperService, useValue: msgStub },
      ],
    });

    svc = TestBed.inject(RoleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getRoles() sets x-lang from LanguageService.current', () => {
    svc.getRoles().subscribe();

    const req = http.expectOne(`${BASE}/get-roles`);
    expect(req.request.headers.get('x-lang')).toBe('uk');
    req.flush({ data: { roles: [], operations: [] } });
  });

  it('checkRoleName(): encodes URL and returns boolean', () => {
    svc.checkRoleName('Admin 1').subscribe((r) => expect(r.data).toBe(true));
    const req = http.expectOne(`${BASE}/check-role-name/Admin%201`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: true });
  });

  it('createRole(): 200 with string data, success tap invoked', () => {
    svc
      .createRole('Role', 'Valid desc')
      .subscribe((r) => expect(typeof r.data).toBe('string'));
    const req = http.expectOne(`${BASE}/create-role`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Role', description: 'Valid desc' });
    req.flush({ data: 'Role' });
  });

  it('updateRole(): 200 with role object', () => {
    svc
      .updateRole({ id: 1, name: 'Role', description: 'Valid desc' } as any)
      .subscribe((r) => {
        expect(r.data.name).toBe('Role');
      });
    const req = http.expectOne(`${BASE}/update-role`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { id: 1, name: 'Role', description: 'Valid desc' } });
  });

  it('updateRoleAccess(): 200 merges shape', () => {
    svc
      .updateRoleAccess(true, 1, { id: 11, object: 'partners' } as any)
      .subscribe((r) => {
        expect(r.data.object).toBe('partners');
        expect(Array.isArray(r.data.ops)).toBeTrue();
      });
    const req = http.expectOne(`${BASE}/update-role-access`);
    expect(req.request.method).toBe('PATCH');
    req.flush({
      data: {
        object: 'partners',
        ops: [{ id: 10, roleId: 1, access: true, disabled: false }],
      },
    });
  });

  it('getRolesNamesList(): 200 array', () => {
    svc.getRolesNamesList().subscribe((r) => expect(r.data.length).toBe(2));
    const req = http.expectOne(`${BASE}/get-roles-names-list`);
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [
        { id: 1, name: 'roleA' },
        { id: 2, name: 'roleB' },
      ],
    });
  });

  it('checkPossibilityToDeleteRole(): warns and returns number', () => {
    svc
      .checkPossibilityToDeleteRole(7)
      .subscribe((r) => expect(r.data).toBe(3));
    const req = http.expectOne(`${BASE}/check-role-before-delete/7`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: 3 });
  });

  it('deleteRole(): 200 null', () => {
    svc.deleteRole(9).subscribe((r) => expect(r.data).toBeNull());
    const req = http.expectOne(`${BASE}/delete-role/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: null });
  });
});
