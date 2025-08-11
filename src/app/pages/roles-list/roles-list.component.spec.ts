import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { of, throwError, Subject } from 'rxjs';
import { RolesListComponent } from './roles-list.component';
import { RoleService } from '../../services/role.service';
import { MessageWrapperService } from '../../services/message.service';
import { ErrorService } from '../../services/error.service';

describe('RolesListComponent', () => {
  let component: RolesListComponent;
  let fixture: ComponentFixture<RolesListComponent>;
  // Spies for service dependencies
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let roleServiceSpy: jasmine.SpyObj<RoleService>;
  let msgWrapperSpy: jasmine.SpyObj<MessageWrapperService>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;

  beforeEach(async () => {
    // Create spy objects for service dependencies
    const roleSvcMock = jasmine.createSpyObj('RoleService', [
      'getRoles',
      'updateRole',
      'updateRoleAccess',
      'deleteRole',
      'checkPossibilityToDeleteRole',
    ]);
    const dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    const errorSvcMock = jasmine.createSpyObj('ErrorService', ['handle']);
    const msgWrapperMock = jasmine.createSpyObj('MessageWrapperService', [
      'success',
      'warn',
    ]);
    const confirmationSvcMock = jasmine.createSpyObj('ConfirmationService', [
      'confirm',
    ]);

    // Configure the testing module with component imports and providers.
    await TestBed.configureTestingModule({
      imports: [RolesListComponent],
      providers: [
        { provide: RoleService, useValue: roleSvcMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: ErrorService, useValue: errorSvcMock },
        { provide: MessageWrapperService, useValue: msgWrapperMock },
        { provide: ConfirmationService, useValue: confirmationSvcMock },
      ],
      // Ignore any unknown attributes/components from Angular Material/PrimeNG used in the template.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    // Create component and inject the services
    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
    roleServiceSpy = TestBed.inject(RoleService) as jasmine.SpyObj<RoleService>;
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    errorServiceSpy = TestBed.inject(
      ErrorService
    ) as jasmine.SpyObj<ErrorService>;
    msgWrapperSpy = TestBed.inject(
      MessageWrapperService
    ) as jasmine.SpyObj<MessageWrapperService>;
    confirmationServiceSpy = TestBed.inject(
      ConfirmationService
    ) as jasmine.SpyObj<ConfirmationService>;
    // Spy on the private loadRoles method to check if it's been called.
    spyOn(component as any, 'loadRoles').and.callThrough();
    // Default behaviour for getRoles to return an empty list.
    roleServiceSpy.getRoles.and.returnValue(
      of({
        msg: 'success',
        data: {
          roles: [],
          operations: [],
        },
      })
    );
  });

  afterEach(() => {
    // Clean up: destroy subscriptions and component fixture if defined.
    if (component) {
      component.ngOnDestroy();
    }
    if (fixture) {
      fixture.destroy();
    }
  });

  // Test initialization of the component.
  describe('ngOnInit', () => {
    it('should load roles and set scrollHeight based on window innerHeight', fakeAsync(() => {
      // Arrange: set window height.
      (window as any).innerHeight = 1000;
      // Act: initialize component.
      component.ngOnInit();
      tick();
      // Assert:
      expect((component as any).loadRoles).toHaveBeenCalled();
      expect(component.scrollHeight).toBe('750px');
    }));
  });

  // Test adding a role.
  describe('onAddRoleClick', () => {
    it('should open CreateRoleDialogComponent and reload roles when result has roleName', fakeAsync(() => {
      // Arrange: create a fake dialog reference that returns an observable.
      const afterClosedSubject = new Subject<any>();
      const fakeDialogRef = {
        afterClosed: () => afterClosedSubject.asObservable(),
      };
      dialogSpy.open.and.returnValue(fakeDialogRef as any);
      // Act: trigger add role click.
      component.onAddRoleClick();
      // Simulate dialog close with roleName.
      afterClosedSubject.next('New Role');
      afterClosedSubject.complete();
      tick();
      // Assert: verify that roles were reloaded and success message was shown.
      expect((component as any).loadRoles).toHaveBeenCalled();
      expect(msgWrapperSpy.success).toHaveBeenCalledWith(
        `Роль 'New Role' создана.`
      );
    }));
    it('should do nothing if dialog result does not contain a roleName', fakeAsync(() => {
      // Arrange: create a fake dialog reference.
      const afterClosedSubject = new Subject<any>();
      const fakeDialogRef = {
        afterClosed: () => afterClosedSubject.asObservable(),
      };
      dialogSpy.open.and.returnValue(fakeDialogRef as any);
      // Act: click on add role.
      component.onAddRoleClick();
      // Simulate dialog close without roleName.
      afterClosedSubject.next(null);
      afterClosedSubject.complete();
      tick();
      // Assert: verify that neither reload nor success message is triggered.
      expect((component as any).loadRoles).not.toHaveBeenCalled();
      expect(msgWrapperSpy.success).not.toHaveBeenCalled();
    }));
  });

  // Test inline editing of role fields.
  describe('onInputChange', () => {
    beforeEach(() => {
      // Pre-load roles data.
      component.roles = [
        { id: 1, name: 'Admin', description: 'Administrator' },
      ];
      // Clone the original roles for change comparison.
      component.originalRoles = [
        { id: 1, name: 'Admin', description: 'Administrator' },
      ];
    });
    it('should trim input and call updateRole when changes exist', fakeAsync(() => {
      // Arrange: simulate update by adding extra space.
      component.roles[0].name = 'Admin';
      component.roles[0].description = 'Admin Updated ';
      roleServiceSpy.updateRole.and.returnValue(
        of({
          msg: 'success',
          data: { id: 1, name: 'Admin', description: 'Admin Updated' },
        })
      );
      // Act: trigger input change event.
      component.onInputChange(0);
      tick();
      // Assert: updateRole should be called and originalRoles updated.
      expect(roleServiceSpy.updateRole).toHaveBeenCalledWith(
        component.roles[0]
      );
      expect(msgWrapperSpy.success).toHaveBeenCalledWith(
        `Роль 'Admin' обновлена.`
      );
      expect(component.roles[0].description).toBe('Admin Updated');
      expect(component.originalRoles[0].description).toBe('Admin Updated');
    }));
    it('should not call updateRole if trimmed name or description is equal to original', () => {
      // Arrange: simulate no real changes, only extra spaces.
      component.roles[0].name = 'Admin';
      component.roles[0].description = 'Administrator     ';
      // Act: trigger change.
      component.onInputChange(0);
      // Assert: no update call should be made.
      expect(roleServiceSpy.updateRole).not.toHaveBeenCalled();
      expect(component.roles[0].description).toEqual('Administrator');
      expect(component.originalRoles[0].description).toEqual('Administrator');
    });
    it('should not call updateRole if trimmed name or description is empty', () => {
      // Arrange: set an empty name after trimming.
      component.roles[0].name = '   ';
      component.roles[0].description = 'Some description';
      // Act:
      component.onInputChange(0);
      // Assert:
      expect(roleServiceSpy.updateRole).not.toHaveBeenCalled();
    });
    it('should not call updateRole if no values have changed', () => {
      // Arrange: set values identical to original.
      component.roles[0].name = 'Admin';
      component.roles[0].description = 'Administrator';
      // Act:
      component.onInputChange(0);
      // Assert:
      expect(roleServiceSpy.updateRole).not.toHaveBeenCalled();
    });
    it('should handle error if updateRole fails', fakeAsync(() => {
      // Arrange: change description to trigger update.
      component.roles[0].description = 'Changed Desc';
      const error = new Error('Update failed');
      roleServiceSpy.updateRole.and.returnValue(throwError(() => error));
      // Act:
      component.onInputChange(0);
      tick();
      // Assert:
      expect(roleServiceSpy.updateRole).toHaveBeenCalled();
      expect(errorServiceSpy.handle).toHaveBeenCalledWith(error);
    }));
  });

  // Test changes on role access.
  describe('onAccessChangeCheck', () => {
    const fakeOperations = [
      {
        id: 101,
        description: 'creating senior data',
        fullAccess: false,
        object: 'senior',
        objectName: 'senior',
        operation: 'SENIOR_CREATING',
        operationName: 'creating',
        rolesAccesses: [
          {
            id: 201,
            roleId: 1,
            access: true,
            disabled: false,
          },
          {
            id: 202,
            roleId: 2,
            access: true,
            disabled: false,
          },
        ],
      },
      {
        id: 102,
        description: 'view senior data',
        fullAccess: false,
        object: 'senior',
        objectName: 'senior',
        operation: 'SENIOR_VIEW',
        operationName: 'view',
        rolesAccesses: [
          {
            id: 203,
            roleId: 1,
            access: true,
            disabled: false,
          },
          {
            id: 204,
            roleId: 2,
            access: true,
            disabled: false,
          },
        ],
      },
    ];

    const dummy = {
      id: 101,
      description: 'creating senior data',
      fullAccess: false,
      object: 'senior',
      objectName: 'senior',
      operation: 'SENIOR_CREATING',
      operationName: 'creating',
      rolesAccesses: [
        {
          id: 201,
          roleId: 1,
          access: true,
          disabled: false,
        },
        {
          id: 202,
          roleId: 2,
          access: false,
          disabled: false,
        },
      ],
    };

    beforeEach(() => {
      // Initialize operations with a sample dataset
      component.operations = fakeOperations;
    });

    it('should update the operations correctly when roleService returns a successful response', () => {
      // Create a fake successful response with updated role access for id 1 only
      const fakeResponse = {
        msg: 'success',
        data: {
          object: 'senior',
          ops: [
            {
              id: 202,
              roleId: 2,
              access: true,
              disabled: false,
            },
            // Notice that operation with id 2 is not provided, so it should remain unchanged
          ],
        },
      };
      // Set the roleService method to return an observable of the successful response
      roleServiceSpy.updateRoleAccess.and.returnValue(of(fakeResponse));
      // Invoke the function under test
      component.onAccessChangeCheck(true, 101, dummy);
      // Verify that the operation with id 1 is updated and the operation with id 2 remains unchanged
      expect(component.operations).toEqual([
        {
          id: 101,
          description: 'creating senior data',
          fullAccess: false,
          object: 'senior',
          objectName: 'senior',
          operation: 'SENIOR_CREATING',
          operationName: 'creating',
          rolesAccesses: [
            {
              id: 201,
              roleId: 1,
              access: true,
              disabled: false,
            },
            {
              id: 202,
              roleId: 2,
              access: true,
              disabled: false,
            },
          ],
        },
        {
          id: 102,
          description: 'view senior data',
          fullAccess: false,
          object: 'senior',
          objectName: 'senior',
          operation: 'SENIOR_VIEW',
          operationName: 'view',
          rolesAccesses: [
            {
              id: 203,
              roleId: 1,
              access: true,
              disabled: false,
            },
            {
              id: 204,
              roleId: 2,
              access: true,
              disabled: false,
            },
          ],
        },
      ]);
    });
    it('should call errorService.handle when the roleService returns an error', () => {
      const fakeError = new Error('Some error occurred');
      // Make roleService return an error
      roleServiceSpy.updateRoleAccess.and.returnValue(
        throwError(() => fakeError)
      );
      // Invoke the function under test
      component.onAccessChangeCheck(false, 101, dummy);
      // Verify that errorService.handle is called with the error
      expect(errorServiceSpy.handle).toHaveBeenCalledWith(fakeError);
    });
    it('should not update any operations if the returned updated object does not match any in the component.', () => {
      // Create a fake response with an object that does not match 'OBJ1'
      const fakeResponse = {
        msg: 'success',
        data: {
          object: 'NonexistentObject',
          ops: [
            {
              id: 202,
              roleId: 2,
              access: true,
              disabled: false,
            },
          ],
        },
      };
      roleServiceSpy.updateRoleAccess.and.returnValue(of(fakeResponse));
      // Invoke the function under test
      component.onAccessChangeCheck(true, 102, dummy);
      // The role access should remain unchanged
      expect(component.operations).toEqual(fakeOperations);
    });
    it('should handle the case when the response returns an empty ops array (boundary case)', () => {
      // Ensure operations are setup correctly
      component.operations = fakeOperations;
      const fakeResponse = {
        msg: 'success',
        data: {
          object: 'NonexistentObject',
          ops: [],
        },
      };
      roleServiceSpy.updateRoleAccess.and.returnValue(of(fakeResponse));
      // Invoke the function under test
      component.onAccessChangeCheck(true, 103, dummy);
      // As there are no updates, the operation should remain unchanged
      expect(component.operations).toEqual(fakeOperations);
    });
  });

  // Test deletion of a role.
  describe('onDeleteRoleClick', () => {
    beforeEach(() => {
      // Set up a role for deletion test.
      component.roles = [
        { id: 1, name: 'DeleteMe', description: 'To be deleted' },
      ];
    });
    it('should confirm deletion and call checkPossibilityToDeleteRole on accept', () => {
      // Arrange: simulate user confirming deletion.
      confirmationServiceSpy.confirm.and.callFake((config: Confirmation) => {
        // Invoke the accept callback.
        config.accept?.();
        return confirmationServiceSpy; // Return confirmation service for chaining.
      });
      // Spy on the private checkPossibilityToDeleteRole to ensure it's triggered.
      spyOn(component as any, 'checkPossibilityToDeleteRole').and.callFake(
        () => {}
      );
      // Act: trigger deletion.
      component.onDeleteRoleClick(0);
      // Assert:
      expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
      expect(
        (component as any).checkPossibilityToDeleteRole
      ).toHaveBeenCalledWith(1, 'DeleteMe');
    });
    it('should not call checkPossibilityToDeleteRole if deletion is rejected', () => {
      // Arrange: simulate user rejecting deletion.
      confirmationServiceSpy.confirm.and.callFake((config: Confirmation) => {
        // Invoke the reject callback.
        config.reject?.();
        return confirmationServiceSpy;
      });
      spyOn(component as any, 'checkPossibilityToDeleteRole').and.callFake(
        () => {}
      );
      // Act:
      component.onDeleteRoleClick(0);
      // Assert:
      expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
      expect(
        (component as any).checkPossibilityToDeleteRole
      ).not.toHaveBeenCalled();
    });
  });

  // Test checking if a role can be deleted.
  describe('checkPossibilityToDeleteRole', () => {
    it('should delete the role if check returns a falsy data', fakeAsync(() => {
      // Arrange: simulate check returns falsy (null) meaning the role is deletable.
      roleServiceSpy.checkPossibilityToDeleteRole.and.returnValue(
        of({ msg: 'success', data: null })
      );
      spyOn(component as any, 'deleteRole').and.callFake(() => {});
      // Act:
      (component as any).checkPossibilityToDeleteRole(1, 'RoleX');
      tick();
      // Assert:
      expect(roleServiceSpy.checkPossibilityToDeleteRole).toHaveBeenCalledWith(
        1
      );
      expect((component as any).deleteRole).toHaveBeenCalledWith(1, 'RoleX');
    }));
    it('should warn if the role is assigned to users', fakeAsync(() => {
      // Arrange: simulate check returns non-falsy data (a list of users).
      roleServiceSpy.checkPossibilityToDeleteRole.and.returnValue(
        of({ msg: 'failed', data: 'User1, User2' })
      );
      spyOn(component as any, 'deleteRole').and.callFake(() => {});
      // Act:
      (component as any).checkPossibilityToDeleteRole(1, 'RoleX');
      tick();
      // Assert:
      expect(msgWrapperSpy.warn).toHaveBeenCalledWith(
        `Невозможно удалить роль 'RoleX'. Она назначена пользователям: 'User1, User2'.`
      );
      expect((component as any).deleteRole).not.toHaveBeenCalled();
    }));
    it('should handle error scenarios in checkPossibilityToDeleteRole', fakeAsync(() => {
      // Arrange: simulate an error in the check.
      const error = new Error('Check error');
      roleServiceSpy.checkPossibilityToDeleteRole.and.returnValue(
        throwError(() => error)
      );
      // Act:
      (component as any).checkPossibilityToDeleteRole(1, 'RoleX');
      tick();
      // Assert:
      expect(errorServiceSpy.handle).toHaveBeenCalledWith(error);
    }));
  });

  // Test actual deletion of the role.
  describe('deleteRole', () => {
    it('should delete role successfully then reload roles and show success message', fakeAsync(() => {
      // Arrange: simulate successful role deletion.
      roleServiceSpy.deleteRole.and.returnValue(
        of({ msg: 'success', data: true })
      );
      // Act:
      (component as any).deleteRole(3, 'RoleX');
      tick();
      // Assert:
      expect(roleServiceSpy.deleteRole).toHaveBeenCalledWith(3);
      expect(msgWrapperSpy.success).toHaveBeenCalledWith(
        `Роль 'RoleX'удалена.`
      );
      expect((component as any).loadRoles).toHaveBeenCalled();
    }));
    it('should handle error if deleteRole fails', fakeAsync(() => {
      // Arrange: simulate failure in role deletion.
      const error = new Error('Deletion error');
      roleServiceSpy.deleteRole.and.returnValue(throwError(() => error));
      // Act:
      (component as any).deleteRole(3, 'RoleX');
      tick();
      // Assert:
      expect(errorServiceSpy.handle).toHaveBeenCalledWith(error);
    }));
  });

  // Test loading roles data.
  describe('loadRoles', () => {
    it('should load roles, clone originalRoles and set operations, then reset isLoading', fakeAsync(() => {
      // Arrange: simulate fetching roles and operations.
      roleServiceSpy.getRoles.and.returnValue(
        of({
          msg: 'success',
          data: {
            roles: [{ id: 1, name: 'NewAdmin', description: 'Administrator' }],
            operations: [
              {
                id: 101,
                description: 'creation senior data',
                fullAccess: false,
                object: 'senior',
                objectName: 'senior',
                operation: 'SENIOR_CREATION',
                operationName: 'creation',
                rolesAccesses: [
                  {
                    id: 1,
                    roleId: 1,
                    access: true,
                    disabled: false,
                  },
                ],
              },
            ],
          },
        })
      );
      // Ensure isLoading is false before loadRoles is called.
      component.isLoading.set(false);
      // Act:
      (component as any).loadRoles();
      tick();
      // Assert:
      expect(component.roles).toEqual([
        { id: 1, name: 'NewAdmin', description: 'Administrator' },
      ]);
      expect(component.originalRoles).toEqual([
        { id: 1, name: 'NewAdmin', description: 'Administrator' },
      ]);
      expect(component.operations).toEqual([
        {
          id: 101,
          description: 'creation senior data',
          fullAccess: false,
          object: 'senior',
          objectName: 'senior',
          operation: 'SENIOR_CREATION',
          operationName: 'creation',
          rolesAccesses: [
            {
              id: 1,
              roleId: 1,
              access: true,
              disabled: false,
            },
          ],
        },
      ]);
      // isLoading should be false after finalization.
      expect(component.isLoading()).toBeFalse();
    }));
    it('should handle error if getRoles fails and reset isLoading', fakeAsync(() => {
      // Arrange: simulate error when fetching roles.
      const error = new Error('Load error');
      roleServiceSpy.getRoles.and.returnValue(throwError(() => error));
      component.isLoading.set(false);
      // Act:
      (component as any).loadRoles();
      tick();
      // Assert:
      expect(errorServiceSpy.handle).toHaveBeenCalledWith(error);
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // Test destruction of the component.
  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      // Arrange: spy on subscriptions.unsubscribe method.
      spyOn((component as any).subscriptions, 'unsubscribe');
      // Act:
      component.ngOnDestroy();
      // Assert:
      expect((component as any).subscriptions.unsubscribe).toHaveBeenCalled();
    });
  });
});
