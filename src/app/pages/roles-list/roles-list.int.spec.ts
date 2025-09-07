import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { RolesListComponent } from './roles-list.component';
import { ConfirmationService } from 'primeng/api';
import { MatDialog } from '@angular/material/dialog';
import { MessageWrapperService } from '../../services/message.service';
import { environment } from '../../../environments/environment';

class EmptyLoader implements TranslateLoader {
  getTranslation() {
    return of({});
  }
}

describe('RolesListComponent (integration)', () => {
  let fixture: ComponentFixture<RolesListComponent>;
  let component: RolesListComponent;
  let http: HttpTestingController;
  const BASE = `${environment.apiUrl}/api/roles`;

  const msgStub = jasmine.createSpyObj('MessageWrapperService', [
    'handle',
    'messageTap',
    'warn',
  ]);

  beforeEach(async () => {
    msgStub.messageTap.and.callFake(
      (_level?: any, _meta?: any, _transform?: any) => (src$: any) => src$
    );
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        // было: HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
        RolesListComponent,
      ],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),

        ConfirmationService,
        {
          provide: MatDialog,
          useValue: jasmine.createSpyObj('MatDialog', ['open']),
        },
        { provide: MessageWrapperService, useValue: msgStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    msgStub.handle.calls.reset();
    msgStub.warn.calls.reset();
    msgStub.messageTap.calls.reset();
  });

  function bootWith(roles: any[], operations: any[]) {
    fixture.detectChanges(); // ngOnInit → loadRoles
    http.expectOne(`${BASE}/get-roles`).flush({ data: { roles, operations } });
    fixture.detectChanges();
  }

  it('init: renders empty state', () => {
    bootWith([], []);
    expect(component.isLoading()).toBeFalse();
    expect(fixture.nativeElement.textContent || '').toContain('TABLE_EMPTY');
  });

  it('inline name: busy → rollback, no updateRole', () => {
    bootWith([{ id: 1, name: 'Old', description: 'SameDesc' }], []);
    component.originalRoles = structuredClone(component.roles);

    component.roles[0].name = 'New';
    component.onInputChange(0);

    http.expectOne(`${BASE}/check-role-name/New`).flush({ data: true });
    http.expectNone(`${BASE}/update-role`);

    expect(component.roles[0].name).toBe('Old');
  });

  it('inline name: free → updateRole → arrays synced', () => {
    bootWith([{ id: 1, name: 'Old', description: 'SameDesc' }], []);
    component.originalRoles = structuredClone(component.roles);

    component.roles[0].name = 'New';
    component.onInputChange(0);

    http.expectOne(`${BASE}/check-role-name/New`).flush({ data: false });
    const upd = http.expectOne(`${BASE}/update-role`);
    expect(upd.request.method).toBe('PATCH');
    upd.flush({ data: { id: 1, name: 'New', description: 'SameDesc' } });
    fixture.detectChanges();

    expect(component.roles[0].name).toBe('New');
    expect(component.originalRoles[0].name).toBe('New');
  });

  it('inline desc only: calls updateRole and syncs, no checkRoleName', () => {
    bootWith([{ id: 1, name: 'Same', description: 'OldDesc' }], []);
    component.originalRoles = structuredClone(component.roles);

    component.roles[0].description = 'NewDesc';
    component.onInputChange(0);

    http.expectNone(`${BASE}/check-role-name/Same`);
    const upd = http.expectOne(`${BASE}/update-role`);
    upd.flush({ data: { id: 1, name: 'Same', description: 'NewDesc' } });
    fixture.detectChanges();

    expect(component.roles[0].description).toBe('NewDesc');
    expect(component.originalRoles[0].description).toBe('NewDesc');
  });

  it('updateRole error → rollback + handle()', () => {
    bootWith([{ id: 1, name: 'Same', description: 'OldDesc' }], []);
    component.originalRoles = structuredClone(component.roles);

    component.roles[0].description = 'NewDesc';
    component.onInputChange(0);

    const upd = http.expectOne(`${BASE}/update-role`);
    upd.flush({ message: 'boom' }, { status: 500, statusText: 'ERR' });

    expect(msgStub.handle).toHaveBeenCalled();
    expect(component.roles[0].description).toBe('OldDesc');
  });

  it('toggle access: merges by id only inside same object', () => {
    // 1) Старт и первый GET
    fixture.detectChanges();
    http.expectOne(`${BASE}/get-roles`).flush({
      data: {
        roles: [{ id: 1, name: 'Admin', description: 'Valid desc' }],
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
              { id: 11, roleId: 2, access: false, disabled: false },
            ],
          },
          {
            operation: 'ADD_NEW_TOPONYM',
            description: 'Add new toponym',
            object: 'toponyms',
            objectName: 'toponyms',
            operationName: 'add',
            accessToAllOps: false,
            rolesAccesses: [
              { id: 20, roleId: 1, access: false, disabled: false },
              { id: 21, roleId: 2, access: false, disabled: false },
            ],
          },
        ],
      },
    });
    fixture.detectChanges();

    expect(component.operations?.length).toBe(2); // теперь не undefined

    // 2) Берём operation из component, а не самосборный
    component.onAccessChangeCheck(true, 1, component.operations![0] as any);

    // 3) PATCH и ответ
    const req = http.expectOne(`${BASE}/update-role-access`);
    expect(req.request.method).toBe('PATCH');
    req.flush({
      data: {
        object: 'partners',
        ops: [{ id: 10, roleId: 1, access: true, disabled: false }],
      },
    });
    fixture.detectChanges();

    // 4) Проверки
    expect(component.operations![0].rolesAccesses).toEqual([
      { id: 10, roleId: 1, access: true, disabled: false },
      { id: 11, roleId: 2, access: false, disabled: false },
    ]);
    expect(component.operations![1].rolesAccesses).toEqual([
      { id: 20, roleId: 1, access: false, disabled: false },
      { id: 21, roleId: 2, access: false, disabled: false },
    ]);
  });

  it('toggle access error → state intact + handle()', () => {
    fixture.detectChanges();
    const snapshot = [
      {
        operation: 'ADD_NEW_PARTNER',
        description: 'Add new partner',
        object: 'partners',
        objectName: 'partners',
        operationName: 'add',
        accessToAllOps: false,
        rolesAccesses: [
          { id: 10, roleId: 1, access: false, disabled: false },
          { id: 11, roleId: 2, access: false, disabled: false },
        ],
      },
      {
        operation: 'ADD_NEW_TOPONYM',
        description: 'Add new toponym',
        object: 'toponyms',
        objectName: 'toponyms',
        operationName: 'add',
        accessToAllOps: false,
        rolesAccesses: [
          { id: 20, roleId: 1, access: false, disabled: false },
          { id: 21, roleId: 2, access: false, disabled: false },
        ],
      },
    ];
    http.expectOne(`${BASE}/get-roles`).flush({
      data: {
        roles: [{ id: 1, name: 'Admin', description: 'Valid desc' }],
        operations: snapshot,
      },
    });
    fixture.detectChanges();

    component.onAccessChangeCheck(true, 1, component.operations![0] as any);

    const req = http.expectOne(`${BASE}/update-role-access`);
    req.flush({}, { status: 500, statusText: 'ERR' });

    expect(msgStub.handle).toHaveBeenCalled();
    expect(component.operations).toEqual(snapshot);
  });

  /*   Expected undefined to equal
  [ Object({
    operation: 'ADD_NEW_PARTNER',
    description: 'Add new partner',
    object: 'partners',
    objectName: 'partners',
    operationName: 'add',
    accessToAllOps: false,
    rolesAccesses: [ Object({ id: 10, roleId: 1, access: false, disabled: false }), Object({ id: 11, roleId: 2, access: false, disabled: false }) ] }), undefined ].
 */
  it('delete accept: can delete → delete → reload', () => {
    const confirm = TestBed.inject(ConfirmationService);
    spyOn(confirm, 'confirm').and.callFake((cfg: any) => cfg.accept?.());

    bootWith([{ id: 10, name: 'Role', description: 'Description' }], []);
    component.onDeleteRoleClick(0);

    http.expectOne(`${BASE}/check-role-before-delete/10`).flush({ data: 0 });
    http.expectOne(`${BASE}/delete-role/10`).flush({ data: null });
    http
      .expectOne(`${BASE}/get-roles`)
      .flush({ data: { roles: [], operations: [] } });
  });

  it('delete accept: has users → no delete', () => {
    const confirm = TestBed.inject(ConfirmationService);
    spyOn(confirm, 'confirm').and.callFake((cfg: any) => cfg.accept?.());

    bootWith([{ id: 2, name: 'Role', description: 'Description' }], []);
    component.onDeleteRoleClick(0);

    http.expectOne(`${BASE}/check-role-before-delete/2`).flush({ data: 3 });
    http.expectNone(`${BASE}/delete-role/2`);
  });

  it('delete reject: nothing happens', () => {
    const confirm = TestBed.inject(ConfirmationService);
    spyOn(confirm, 'confirm').and.callFake((cfg: any) => cfg.reject?.());

    bootWith([{ id: 3, name: 'Role', description: 'Description' }], []);
    component.onDeleteRoleClick(0);

    http.expectNone(`${BASE}/check-role-before-delete/3`);
    http.expectNone(`${BASE}/delete-role/3`);
  });

  it('sanitizes role name before confirm message', () => {
    bootWith(
      [{ id: 5, name: '<script>xox</script>', description: 'Description' }],
      []
    );

    const confirmation = TestBed.inject(ConfirmationService) as any;

    // Всегда делаем spy заново и не вызываем accept/reject,
    // чтобы НЕ улетал HTTP-запрос check-role-before-delete
    const confirmSpy = spyOn(confirmation, 'confirm').and.callFake(
      (_cfg: any) => {}
    );

    const sanitizeSpy = spyOn(
      component as any,
      'sanitizeText'
    ).and.callThrough();

    component.onDeleteRoleClick(0);

    expect(sanitizeSpy).toHaveBeenCalledWith('<script>xox</script>');
    http.expectNone(`${BASE}/check-role-before-delete/5`); // ничего не улетело
  });

  it('Add role: opens dialog and reloads when closed with value', () => {
    const dialog = TestBed.inject(MatDialog) as any;
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => of('NewRole'),
    });

    bootWith([], []);
    const reloadSpy = spyOn<any>(component, 'loadRoles').and.callThrough();

    component.onAddRoleClick();

    const reloadReq = http.expectOne(`${BASE}/get-roles`);
    expect(reloadReq.request.method).toBe('GET');
    reloadReq.flush({ data: { roles: [], operations: [] } });
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('Add role: closes with null → no reload', () => {
    const dialog = TestBed.inject(MatDialog) as any;
    (dialog.open as jasmine.Spy).and.returnValue({
      afterClosed: () => of(null),
    });

    bootWith([], []);
    const reloadSpy = spyOn<any>(component, 'loadRoles').and.callThrough();

    component.onAddRoleClick();

    expect(dialog.open).toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
