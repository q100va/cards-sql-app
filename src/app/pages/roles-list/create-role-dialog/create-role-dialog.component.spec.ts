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
import { of, Subject, throwError } from 'rxjs';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateRoleDialogComponent', () => {
  let component: CreateRoleDialogComponent;
  let fixture: ComponentFixture<CreateRoleDialogComponent>;
  let roleServiceSpy: jasmine.SpyObj<RoleService>;
  let messageWrapperSpy: jasmine.SpyObj<MessageWrapperService>;
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CreateRoleDialogComponent>>;

  beforeEach(async () => {
    // Create spies for injected services
    roleServiceSpy = jasmine.createSpyObj('RoleService', [
      'checkRoleName',
      'createRole',
    ]);
    messageWrapperSpy = jasmine.createSpyObj('MessageWrapperService', [
      'warn',
      'handle',
    ]);
    confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', [
      'confirm',
    ]);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    // Configure the testing module
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
        { provide: MatDialogRef, useValue: dialogRefSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { userId: 1, userName: 'TestUser' },
        },
      ],
      // Ignore unknown Angular Material/PrimeNG elements
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    // Create the component and run initial bindings
    fixture = TestBed.createComponent(CreateRoleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Cleanup after each test
    if (fixture) {
      fixture.destroy();
    }
  });

  describe('onCreateRoleClick', () => {
    it('does not proceed if roleName or roleDescription is invalid - empty', () => {
      // Set empty values
      component.roleName.setValue('');
      component.roleDescription.setValue('');

      // Trigger
      component.onCreateRoleClick();

      // No calls, loading remains false
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    });

    it('does not proceed if roleName or roleDescription is invalid - only spaces', () => {
      // Set whitespace-only values
      component.roleName.setValue('   ');
      component.roleDescription.setValue('     ');

      component.onCreateRoleClick();

      // No calls, loading remains false
      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    });

    it('does not call services when zod validation fails (too short name)', () => {
      component.roleName.setValue('a'); // shorter than min(2)
      component.roleDescription.setValue('Valid description');

      component.onCreateRoleClick();

      // No calls
      expect(roleServiceSpy.checkRoleName).not.toHaveBeenCalled();
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    });

    it('warns if the role name is already taken', fakeAsync(() => {
      const roleName = 'TestRole';
      const roleDescription = 'Test Description';

      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);

      // checkRoleName returns "exists"
      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'failed', data: true })
      );

      component.onCreateRoleClick();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).toHaveBeenCalledWith(roleName);
      expect(messageWrapperSpy.warn).toHaveBeenCalledWith(
        `Название '${roleName}' уже занято! Выберите другое.`
      );
      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
    }));

    it('handles error from checkRoleName', fakeAsync(() => {
      const roleName = 'Valid';
      const roleDescription = 'Valid description';

      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);

      const error = new Error('check failed');
      roleServiceSpy.checkRoleName.and.returnValue(throwError(() => error));

      component.onCreateRoleClick();
      tick();

      expect(roleServiceSpy.createRole).not.toHaveBeenCalled();
      expect(messageWrapperSpy.handle).toHaveBeenCalledWith(error);
      expect(component.isLoading).toBeFalse();
    }));

    it('creates role when name is available', fakeAsync(() => {
      const roleName = 'NewRole';
      const roleDescription = 'New Description';

      // With extra spaces to check trimming
      component.roleName.setValue('   ' + roleName + '   ');
      component.roleDescription.setValue('   ' + roleDescription + '   ');

      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'success', data: false })
      );
      roleServiceSpy.createRole.and.returnValue(
        of({ msg: 'success', data: roleName })
      );

      component.onCreateRoleClick();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).toHaveBeenCalledWith(roleName);
      expect(roleServiceSpy.createRole).toHaveBeenCalledWith(
        roleName,
        roleDescription
      );
      expect(dialogRefSpy.close).toHaveBeenCalledWith(roleName);
    }));

    it('does not close dialog if createRole returns undefined', fakeAsync(() => {
      const roleName = 'Valid';
      const roleDescription = 'Valid description';

      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);

      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'ok', data: false })
      );
      roleServiceSpy.createRole.and.returnValue(of(undefined as any));

      component.onCreateRoleClick();
      tick();

      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    }));

    it('toggles isLoading true→false around the request', fakeAsync(() => {
      const roleName = 'Valid';
      const roleDescription = 'Valid description';

      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);

      const check$ = new Subject<{ msg: string; data: boolean }>();
      const create$ = new Subject<{ msg: string; data: string }>();

      roleServiceSpy.checkRoleName.and.returnValue(check$);
      roleServiceSpy.createRole.and.returnValue(create$);

      // Start
      component.onCreateRoleClick();
      expect(component.isLoading).toBeTrue();

      // Resolve check: name available
      check$.next({ msg: 'ok', data: false });
      check$.complete();
      expect(component.isLoading).toBeTrue();

      // Resolve creation
      create$.next({ msg: 'ok', data: roleName });
      create$.complete();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(roleName);
    }));

    it('disables submit button when form invalid or loading', () => {
      // Case: invalid form
      component.roleName.setValue('');
      component.roleDescription.setValue('');
      fixture.detectChanges();

      const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
        '.dialog-submit-button'
      );
      expect(btn).toBeTruthy();
      expect(btn!.disabled).toBeTrue();

      // Case: valid form but loading
      component.roleName.setValue('Valid');
      component.roleDescription.setValue('Valid description');
      component.isLoading = true;
      fixture.detectChanges();

      expect(btn!.disabled).toBeTrue();
    });

    it('handles error when createRole fails', fakeAsync(() => {
      const roleName = 'ValidRole';
      const roleDescription = 'Valid Description';

      component.roleName.setValue(roleName);
      component.roleDescription.setValue(roleDescription);

      roleServiceSpy.checkRoleName.and.returnValue(
        of({ msg: 'success', data: false })
      );

      const error = new Error('Creation failed');
      roleServiceSpy.createRole.and.returnValue(throwError(() => error));

      component.onCreateRoleClick();
      tick();

      expect(component.isLoading).toBeFalse();
      expect(roleServiceSpy.checkRoleName).toHaveBeenCalledWith(roleName);
      expect(roleServiceSpy.createRole).toHaveBeenCalledWith(
        roleName,
        roleDescription
      );
      expect(messageWrapperSpy.handle).toHaveBeenCalledWith(error);
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    }));
  });

  describe('onCancelClick', () => {
    it('confirms cancellation and closes the dialog on acceptance', () => {
      const fakeEvent = { target: document.createElement('div') };

      // Mock ConfirmationService to call the accept callback
      confirmationServiceSpy.confirm.and.callFake((config: Confirmation) => {
        config.accept?.();
        return confirmationServiceSpy;
      });

      // Trigger cancel click
      component.onCancelClick(fakeEvent as unknown as Event);

      // Confirm called and dialog closed with null
      expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });

    it('does not close the dialog if cancellation is rejected', () => {
      const fakeEvent = { target: document.createElement('div') };

      // Mock ConfirmationService to call the reject callback
      confirmationServiceSpy.confirm.and.callFake((config: Confirmation) => {
        config.reject?.();
        return confirmationServiceSpy;
      });

      // Trigger cancel click
      component.onCancelClick(fakeEvent as unknown as Event);

      // Confirm called but dialog not closed
      expect(confirmationServiceSpy.confirm).toHaveBeenCalled();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });
});
