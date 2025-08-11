import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { CreateRoleDialogComponent } from './create-role-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RoleService } from '../../../services/role.service';
import { MessageWrapperService } from '../../../services/message.service';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { ErrorService } from '../../../services/error.service';
import { of, throwError } from 'rxjs';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
describe('CreateRoleDialogComponent', () => {
  let component: CreateRoleDialogComponent;
  let fixture: ComponentFixture<CreateRoleDialogComponent>;
  let roleServiceSpy: jasmine.SpyObj<RoleService>;
  let messageWrapperSpy: jasmine.SpyObj<MessageWrapperService>;
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CreateRoleDialogComponent>>;
  beforeEach(async () => {
    // Create spy objects for the injected services
    roleServiceSpy = jasmine.createSpyObj('RoleService', [
      'checkRoleName',
      'createRole',
    ]);
    messageWrapperSpy = jasmine.createSpyObj('MessageWrapperService', ['warn']);
    confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', [
      'confirm',
    ]);
    errorServiceSpy = jasmine.createSpyObj('ErrorService', ['handle']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    // Configure the testing module with required imports, providers and schemas
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        FormsModule,
        CreateRoleDialogComponent,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: RoleService, useValue: roleServiceSpy },
        { provide: MessageWrapperService, useValue: messageWrapperSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
        { provide: ErrorService, useValue: errorServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { userId: 1, userName: 'TestUser' },
        },
      ],
      // Schema to ignore unknown elements from Angular Material/PrimeNG
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    // Create the component instance and trigger initial data binding.
    fixture = TestBed.createComponent(CreateRoleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  describe('onCreateRoleClick', () => {
    it('should not proceed if roleName or roleDescription is invalid - empty', () => {
      // Set empty values for role name and description
      component.roleName.setValue('');
      component.roleDescription.setValue('');

      // Trigger the creation process
      component.onCreateRoleClick();

      // Verify that no service calls are made and loading flag is false
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    });
    it('should not proceed if roleName or roleDescription is invalid - contains only spaces', () => {
      // Set values that contain only white spaces
      component.roleName.setValue('   ');
      component.roleDescription.setValue('     ');
      // Trigger the creation process
      component.onCreateRoleClick();
      // Verify that no service calls are made and loading flag remains false
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    });
    it('should warn if the role name is already taken', fakeAsync(() => {
      const roleName = 'TestRole';
      const roleDescription = 'Test Description';
      // Set valid role name and description
      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);
      // Simulate role name check response indicating the role already exists
      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'failed', data: true })
      );
      // Trigger the role creation
      component.onCreateRoleClick();
      tick();
      // Verify proper service calls and display of a warning message
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).toHaveBeenCalledWith(roleName);
      expect(messageWrapperSpy.warn).toHaveBeenCalledWith(
        `Название '${roleName}' уже занято! Выберите другое.`
      );
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    }));
    it('should create role when role name is available', fakeAsync(() => {
      const roleName = 'NewRole';
      const roleDescription = 'New Description';
      // Simulate extra spaces to test trimming functionality
      component.roleName.setValue('   ' + roleName + '   ');
      component.roleDescription.setValue('   ' + roleDescription + '   ');
      // Simulate role name check response indicating the role name is available
      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'success', data: false })
      );
      // Simulate successful role creation response
      roleServiceSpy.createRole.and.returnValue(
        of({ msg: 'success', data: roleName })
      );
      // Trigger the role creation process
      component.onCreateRoleClick();
      tick();
      // Verify that the proper service calls were made and dialog closed with the created role name
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).toHaveBeenCalledWith(roleName);
      expect(roleServiceSpy.createRole).toHaveBeenCalledWith(
        roleName,
        roleDescription
      );
      expect(dialogRefSpy.close).toHaveBeenCalledWith(roleName);
    }));
    it('should handle error when createRole fails', fakeAsync(() => {
      const roleName = 'ValidRole';
      const roleDescription = 'Valid Description';
      // Set valid role data
      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);
      // Simulate response indicating role name is available
      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'success', data: false })
      );
      // Simulate an error during role creation
      const error = new Error('Creation failed');
      roleServiceSpy.createRole.and.returnValue(throwError(() => error));
      // Trigger the role creation process
      component.onCreateRoleClick();
      tick();
      // Verify that the error is handled and dialog does not close
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).toHaveBeenCalledWith(roleName);
      expect(roleServiceSpy.createRole).toHaveBeenCalledWith(
        roleName,
        roleDescription
      );
      expect(errorServiceSpy.handle).toHaveBeenCalledWith(error);
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    }));
  });
  describe('onCancelClick', () => {
    it('should confirm cancellation and close the dialog on acceptance', () => {
      const fakeEvent = { target: document.createElement('div') };
      // Simulate confirmation service triggering the accept callback
      confirmationServiceSpy.confirm.and.callFake((config: Confirmation) => {
        config.accept?.();
        return confirmationServiceSpy; // Allows method chaining if needed
      });
      // Invoke the cancel click handler
      component.onCancelClick(fakeEvent as unknown as Event);
      // Verify that confirmation occurred and dialog was closed with cancellation response
      expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ success: false });
    });
    it('should not close the dialog if cancellation is rejected', () => {
      const fakeEvent = { target: document.createElement('div') };
      // Simulate confirmation service triggering the reject callback
      confirmationServiceSpy.confirm.and.callFake((config: Confirmation) => {
        config.reject?.();
        return confirmationServiceSpy;
      });
      // Invoke the cancel click handler
      component.onCancelClick(fakeEvent as unknown as Event);
      // Verify that confirmation occurred but dialog remains open
      expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });
});
