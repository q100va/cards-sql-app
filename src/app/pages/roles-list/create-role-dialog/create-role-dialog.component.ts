// Angular and Angular Material dependencies
import { Component, DestroyRef, inject, ViewEncapsulation } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// Angular Forms modules and validators
import {
  FormControl,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
// Angular Material UI modules for buttons, form fields, input, grid list, and icons
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
// Custom services and utilities
import { RoleService } from '../../../services/role.service';
import { ConfirmationService } from 'primeng/api';
import { ErrorService } from '../../../services/error.service';
import { noOnlySpacesValidator } from '../../../utils/custom.validator';
import { MessageWrapperService } from '../../../services/message.service';
// RxJS imports for reactive programming
import { EMPTY } from 'rxjs';
import { switchMap, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-create-role-dialog',
  imports: [
    // Angular Material dialog components
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    // Material form modules
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    // Angular form modules
    FormsModule,
    ReactiveFormsModule,
    // Other Material components
    MatGridListModule,
    MatIconModule,
  ],
  providers: [],
  templateUrl: './create-role-dialog.component.html',
  styleUrls: ['./create-role-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CreateRoleDialogComponent {
  // Injecting services and dialog references using Angular's DI
   private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<CreateRoleDialogComponent>);
  readonly data = inject<{ userId: number; userName: string }>(MAT_DIALOG_DATA);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly errorService = inject(ErrorService);

  // Flag to indicate when an operation is in progress
  isLoading = false;
  // Form control for the role name with required validators
  roleName = new FormControl<string | null>(null, [
    Validators.required,
    Validators.maxLength(50),
    noOnlySpacesValidator,
  ]);
  // Form control for the role description with required validators
  roleDescription = new FormControl<string | null>(null, [
    Validators.required,
    Validators.maxLength(500),
    noOnlySpacesValidator,
  ]);

  // Method invoked when the user submits the role creation form
  public onCreateRoleClick(): void {
    // Check if form inputs are invalid and cancel creation if not valid
    if (this.roleName.invalid || this.roleDescription.invalid) {
      return;
    }
    // Trim the input to remove any extra spaces
    const trimmedRoleName = this.roleName.value!.trim();
    const trimmedRoleDescription = this.roleDescription.value!.trim();
    // Set the loading flag to true while processing the request
    this.isLoading = true;
    // First, verify that the role name is available before creation
    this.roleService
      .checkRoleName(trimmedRoleName)
      .pipe(
        // If the role name exists, warn the user; otherwise, create a new role
        switchMap((res) => {
          if (res.data) {
            this.msgWrapper.warn(
              `Название '${trimmedRoleName}' уже занято! Выберите другое.`
            );
            // Return an empty observable to stop further actions
            return EMPTY;
          } else {
            // Proceed to create the role with the provided details
            return this.roleService.createRole(
              trimmedRoleName,
              trimmedRoleDescription
            );
          }
        }),
        // Finalize the process by resetting the loading flag regardless of outcome
        finalize(() => (this.isLoading = false)),
        //Ensure that any subscriptions are automatically cleaned up when the component is destroyed, thereby preventing memory leaks
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          // Close dialog with the new role name if creation was successful
          if (res) {
            console.log(res);
            this.dialogRef.close(res.data);
          }
        },
        error: (err) => {
          // Handle any errors that occur during the operation
          this.errorService.handle(err);
        },
      });
  }

  // Method invoked when the user cancels the creation process
  public onCancelClick(event: Event): void {
    const target = event.target as EventTarget;
    this.confirmationService.confirm({
      target, // The element where the confirmation dialog should be anchored
      message: 'Вы уверены, что хотите выйти без сохранения?',
      header: 'Предупреждение',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      // Properties for the reject (cancel) button
      rejectButtonProps: {
        label: 'Нет',
      },
      // Properties for the accept (confirm) button
      acceptButtonProps: {
        label: 'Да',
        severity: 'secondary',
        outlined: true,
      },
      // Callback for when the user confirms exit
      accept: () => {
        this.dialogRef.close({ success: false });
      },
      // Callback for when the user rejects exit (no action needed)
      reject: () => {},
    });
  }
}
