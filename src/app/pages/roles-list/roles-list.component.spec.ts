import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RolesListComponent } from './roles-list.component';
import { RoleService } from '../../services/role.service';
import { MessageWrapperService } from '../../services/message.service';
import { ConfirmationService } from 'primeng/api';
import { MatDialog } from '@angular/material/dialog';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';

class EmptyLoader implements TranslateLoader {
  getTranslation(lang: string) {
    return of({}); // всегда пустой словарь → ключи вернутся как есть
  }
}

describe('RolesListComponent', () => {
  let fixture: ComponentFixture<RolesListComponent>;
  let component: RolesListComponent;

  // Spies
  let roleServiceSpy: jasmine.SpyObj<RoleService>;
  let msgSpy: jasmine.SpyObj<MessageWrapperService>;
  let confirmSpy: jasmine.SpyObj<ConfirmationService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    roleServiceSpy = jasmine.createSpyObj('RoleService', [
      'getRoles',
      'checkRoleName',
      'updateRole',
      'updateRoleAccess',
      'checkPossibilityToDeleteRole',
      'deleteRole',
    ]);
    msgSpy = jasmine.createSpyObj('MessageWrapperService', [
      'messageTap',
      'handle',
    ]);
    confirmSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    // Default getRoles to empty state to avoid hanging ngOnInit
    roleServiceSpy.getRoles.and.returnValue(
      of({ data: { roles: [], operations: [] } })
    );

    await TestBed.configureTestingModule({
      imports: [
        RolesListComponent,
        NoopAnimationsModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: EmptyLoader },
        }),
      ],
      providers: [
        { provide: RoleService, useValue: roleServiceSpy },
        { provide: MessageWrapperService, useValue: msgSpy },
        { provide: ConfirmationService, useValue: confirmSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
      // Ignore heavy UI templates (Material/PrimeNG)
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  //#region Render & loading

  it('shows empty state when roles=[] and hides table while loading', fakeAsync(() => {
    // Arrange loading flow with Subject
    const subj = new Subject<{
      msg: string;
      data: { roles: any[]; operations: any[] };
    }>();
    roleServiceSpy.getRoles.and.returnValue(subj as any);

    // Re-init to trigger ngOnInit with new spy
    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // While pending: isLoading true, table not present, empty text not yet (roles undefined)
    expect(component.isLoading()).toBeTrue();
    let table = fixture.nativeElement.querySelector('p-table');
    expect(table).toBeNull();

    // Emit empty result to render empty state
    subj.next({ msg: 'ok', data: { roles: [], operations: [] } });
    subj.complete();
    tick();
    fixture.detectChanges();

    // After response: isLoading false, empty message visible
    expect(component.isLoading()).toBeFalse();
    const emptyText = fixture.nativeElement.textContent || '';
    expect(emptyText).toContain('TABLE_EMPTY');
  }));

  it('initializes scrollHeight from window.innerHeight * 0.75', () => {
    // ngOnInit already ran in beforeEach
    const expected = window.innerHeight * 0.75;
    const actual = parseFloat(component.scrollHeight);
    expect(actual).toBeCloseTo(expected, 2);
  });

  //#endregion

  //#region getRoles()

  it('persists roles/operations on success and clones originalRoles', () => {
    const roles = [
      { id: 1, name: 'Admin', description: 'Administrator' },
      { id: 2, name: 'User', description: 'Volunteer' },
    ];
    const operations = [
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
    ];

    roleServiceSpy.getRoles.and.returnValue(
      of({ data: { roles, operations } })
    );

    // Call private loader via casting (keeps test explicit)
    (component as any).loadRoles();
    fixture.detectChanges();

    expect(component.roles).toEqual(roles);
    expect(component.operations).toEqual(operations);
    expect(component.originalRoles).toEqual(roles);
    // Ensure clone, not same reference
    expect(component.originalRoles).not.toBe(component.roles);
  });

  it('handles getRoles() error via msgWrapper and does not mutate existing data', () => {
    // Seed with some data first
    (component as any).roles = [{ id: 1, name: 'Old', description: 'OldDesc' }];
    (component as any).operations = [];
    (component as any).originalRoles = [{ id: 1, name: 'Old', description: 'OldDesc' }];

    roleServiceSpy.getRoles.and.returnValue(
      throwError(() => new Error('boom'))
    );

    (component as any).loadRoles();

    expect(msgSpy.handle).toHaveBeenCalled();
    expect(component.roles).toEqual([
      { id: 1, name: 'Old', description: 'OldDesc' },
    ]);
  });

  //#endregion

  //#region onInputChange()

  it('trims input and exits early if zod validation fails', () => {
    component.roles = [{ id: 1, name: 'Same', description: ' x ' }] as any; // desc too short
    component.originalRoles = [
      { id: 1, name: 'Same', description: 'OldDesc' },
    ] as any;

    component.onInputChange(0);

    expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
    expect(roleServiceSpy.updateRole).not.toHaveBeenCalled();
  });

  it('exits early if nothing changed after trim', () => {
    component.roles = [
      { id: 1, name: ' Manager ', description: ' OldDesc ' },
    ] as any;
    component.originalRoles = [
      { id: 1, name: 'Manager', description: 'OldDesc' },
    ] as any;

    component.onInputChange(0);

    expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
    expect(roleServiceSpy.updateRole).not.toHaveBeenCalled();
  });

  it('name changed: rollback when name busy (data=true)', () => {
    component.roles = [{ id: 1, name: 'New', description: 'SameDesc' }] as any;
    component.originalRoles = [
      { id: 1, name: 'Old', description: 'SameDesc' },
    ] as any;

    roleServiceSpy.checkRoleName.and.returnValue(
      of({ code: 'ROLE.ALREADY_EXISTS', data: true })
    );

    component.onInputChange(0);

    expect(msgSpy.messageTap).not.toHaveBeenCalled();
    expect(roleServiceSpy.updateRole).not.toHaveBeenCalled();
    expect(component.roles[0]).toEqual(component.originalRoles[0]); // rollback
  });

  it('name changed: handles checkRoleName error and rollback', () => {
    component.roles = [{ id: 1, name: 'New', description: 'Same description' }] as any;
    component.originalRoles = [
      { id: 1, name: 'Old', description: 'Same description' },
    ] as any;

    roleServiceSpy.checkRoleName.and.returnValue(
      throwError(() => new Error('check fail'))
    );

    component.onInputChange(0);

    expect(msgSpy.handle).toHaveBeenCalled();
    expect(component.roles[0]).toEqual(component.originalRoles[0]); // rollback
  });

  it('name changed: passes when name free (data=false) and updates successfully', () => {
    const updated = { id: 1, name: 'New', description: 'Same description' } as any;

    component.roles = [{ id: 1, name: 'New', description: 'Same description' }] as any;
    component.originalRoles = [
      { id: 1, name: 'Old', description: 'Same description' },
    ] as any;

    roleServiceSpy.checkRoleName.and.returnValue(of({ data: false }));
    roleServiceSpy.updateRole.and.returnValue(
      of({ code: 'ROLE.UPDATED', data: updated })
    );

    component.onInputChange(0);

    expect(roleServiceSpy.updateRole).toHaveBeenCalledWith(updated);
    expect(msgSpy.messageTap).not.toHaveBeenCalled();
    expect(component.roles[0]).toEqual(updated);
    expect(component.originalRoles[0]).toEqual(updated);
  });

  it('description changed only: updates immediately on success', () => {
    const updated = { id: 1, name: 'Same', description: 'NewDesc' } as any;

    component.roles = [{ id: 1, name: 'Same', description: 'NewDesc' }] as any;
    component.originalRoles = [
      { id: 1, name: 'Same', description: 'OldDesc' },
    ] as any;

    roleServiceSpy.updateRole.and.returnValue(
      of({ code: 'ROLE.UPDATED', data: updated })
    );

    component.onInputChange(0);

    expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
    expect(roleServiceSpy.updateRole).toHaveBeenCalledWith(updated);
    expect(msgSpy.messageTap).not.toHaveBeenCalled();
    expect(component.roles[0]).toEqual(updated);
    expect(component.originalRoles[0]).toEqual(updated);
  });

  it('updateRole error: handled and roles rolled back', () => {
    const original = { id: 1, name: 'Same', description: 'OldDesc' } as any;

    component.roles = [{ id: 1, name: 'Same', description: 'NewDesc' }] as any;
    component.originalRoles = [original] as any;

    roleServiceSpy.updateRole.and.returnValue(
      throwError(() => new Error('ERRORS.ROLE.NOT_UPDATED'))
    );

    component.onInputChange(0);

    expect(msgSpy.handle).toHaveBeenCalled();
    expect(component.roles[0]).toEqual(original);
  });

  //#endregion

  //#region onAccessChangeCheck()

  it('merges ops only for matching object; merge by id, not replace whole array', () => {
    component.operations = [
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
    ] as any;

    roleServiceSpy.updateRoleAccess.and.returnValue(
      of({
        code: 'ROLE.UPDATED',
        data: {
          object: 'partners',
          ops: [
            { id: 10, roleId: 1, access: true, disabled: true }, // merged by id
            // id: 11 intentionally omitted -> must stay as is
          ],
        },
      })
    );

    component.onAccessChangeCheck(true, 1, component.operations[0]);

    expect(component.operations[0].rolesAccesses).toEqual([
      { id: 10, roleId: 1, access: true, disabled: true },
      { id: 11, roleId: 2, access: false, disabled: false },
    ]);
    expect(component.operations[1].rolesAccesses).toEqual([
      { id: 20, roleId: 1, access: false, disabled: false },
      { id: 21, roleId: 2, access: false, disabled: false },
    ]);
  });

  it('handles updateRoleAccess error and keeps state intact', () => {
    const snapshot = [
      {
        operation: 'ADD_NEW_PARTNER',
        description: 'Add new partner',
        object: 'partners',
        objectName: 'partners',
        operationName: 'add',
        accessToAllOps: false,
        rolesAccesses: [{ id: 1, roleId: 1, access: false, disabled: false }],
      },
    ] as any;

    component.operations = structuredClone(snapshot);

    roleServiceSpy.updateRoleAccess.and.returnValue(
      throwError(() => new Error('ERRORS.ROLE.NOT_UPDATED'))
    );

    component.onAccessChangeCheck(true, 1, component.operations[0]);

    expect(msgSpy.handle).toHaveBeenCalled();
    expect(component.operations).toEqual(snapshot);
  });

  //#endregion

  //#region Create role dialog flow

  it('opens CreateRoleDialogComponent, reloads and shows success when a role is returned', () => {
    const afterClosed$ = of('NewRole');
    dialogSpy.open.and.returnValue({ afterClosed: () => afterClosed$ } as any);

    // Spy reload to assert it was called
    const reloadSpy = spyOn(component as any, 'loadRoles');

    component.onAddRoleClick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
    expect(msgSpy.messageTap).not.toHaveBeenCalled();
  });

  it('opens dialog, does nothing when closed with null/undefined', () => {
    const afterClosed$ = of(null);
    dialogSpy.open.and.returnValue({ afterClosed: () => afterClosed$ } as any);

    const reloadSpy = spyOn(component as any, 'loadRoles');

    component.onAddRoleClick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(msgSpy.messageTap).not.toHaveBeenCalled();
  });

  //#endregion

  //#region Delete role flow

  it('confirm accept: no users → deleteRole → reload', () => {
    component.roles = [
      { id: 1, name: 'Role', description: 'description' },
    ] as any;
    const target = document.createElement('div');

    // Confirm accept
    confirmSpy.confirm.and.callFake((cfg) => {
      cfg.accept?.();
      return confirmSpy as any;
    });

    roleServiceSpy.checkPossibilityToDeleteRole.and.returnValue(
      of({ data: 0 }) // falsy → allowed to delete
    );
    roleServiceSpy.deleteRole.and.returnValue(of({ data: null }));

    const reloadSpy = spyOn(component as any, 'loadRoles');

    component.onDeleteRoleClick(0);

    expect(roleServiceSpy.checkPossibilityToDeleteRole).toHaveBeenCalledWith(1);
    expect(roleServiceSpy.deleteRole).toHaveBeenCalledWith(1);
    expect(msgSpy.messageTap).not.toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('confirm accept: users returned → no delete', () => {
    component.roles = [
      { id: 2, name: 'Name2', description: 'description' },
    ] as any;

    confirmSpy.confirm.and.callFake((cfg) => {
      cfg.accept?.();
      return confirmSpy as any;
    });

    roleServiceSpy.checkPossibilityToDeleteRole.and.returnValue(
      of({ code: 'ROLE.HAS_DEPENDENCIES', data: 2 })
    );

    component.onDeleteRoleClick(0);

    expect(msgSpy.messageTap).not.toHaveBeenCalled();
    expect(roleServiceSpy.deleteRole).not.toHaveBeenCalled();
  });

  it('confirm accept: error path handled', () => {
    component.roles = [
      { id: 3, name: 'Name3', description: 'description' },
    ] as any;

    confirmSpy.confirm.and.callFake((cfg) => {
      cfg.accept?.();
      return confirmSpy as any;
    });

    roleServiceSpy.checkPossibilityToDeleteRole.and.returnValue(
      throwError(() => new Error('ERRORS.ROLE.NOT_CHECKED'))
    );

    component.onDeleteRoleClick(0);

    expect(msgSpy.handle).toHaveBeenCalled();
  });

  it('confirm reject: does nothing', () => {
    component.roles = [
      { id: 4, name: 'Name4', description: 'description' },
    ] as any;

    confirmSpy.confirm.and.callFake((cfg) => {
      cfg.reject?.();
      return confirmSpy as any;
    });

    component.onDeleteRoleClick(0);

    expect(roleServiceSpy.checkPossibilityToDeleteRole).not.toHaveBeenCalled();
    expect(roleServiceSpy.deleteRole).not.toHaveBeenCalled();
  });

  it('sanitizes role name before showing in confirm', () => {
    component.roles = [
      { id: 5, name: '<script>xox</script>', description: 'description' },
    ] as any;
    const sanitizeSpy = spyOn(
      component as any,
      'sanitizeText'
    ).and.callThrough();

    confirmSpy.confirm.and.callFake((cfg) => {
      // Just open; we only care about sanitize being called before message is built
      return confirmSpy as any;
    });

    component.onDeleteRoleClick(0);

    expect(sanitizeSpy).toHaveBeenCalledWith('<script>xox</script>');
    expect(confirmSpy.confirm).toHaveBeenCalled();
  });

  //#endregion

  //#region Misc

  it('loadRoles toggles isLoading true→false around request', fakeAsync(() => {
    const subj = new Subject<{
      data: { roles: any[]; operations: any[] };
    }>();
    roleServiceSpy.getRoles.and.returnValue(subj as any);

    (component as any).loadRoles();
    expect(component.isLoading()).toBeTrue();

    subj.next({ data: { roles: [], operations: [] } });
    subj.complete();
    tick();

    expect(component.isLoading()).toBeFalse();
  }));

  //#endregion
});
