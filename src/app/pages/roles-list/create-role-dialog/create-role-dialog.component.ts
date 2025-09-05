// Angular core
import {
  Component,
  DestroyRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';

// Angular Material dialog
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

// Forms and validation
import {
  FormControl,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

// Material UI modules
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';

// Services
import { RoleService } from '../../../services/role.service';
import { ConfirmationService } from 'primeng/api';
import { MessageWrapperService } from '../../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// RxJS
import { EMPTY } from 'rxjs';
import { switchMap, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Validation
import { roleDraftSchema } from '@shared/schemas/role.schema';
import { zodValidator } from 'src/app/utils/zod-validator';

@Component({
  selector: 'app-create-role-dialog',
  imports: [
    // Material dialog
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    // Material form + UI
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatGridListModule,
    MatIconModule,
    // Angular forms
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './create-role-dialog.component.html',
  styleUrls: ['./create-role-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CreateRoleDialogComponent {
  // Dependencies
  private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<CreateRoleDialogComponent>);
  readonly data = inject<{ userId: number; userName: string }>(MAT_DIALOG_DATA);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translateService = inject(TranslateService);

  // UI state
  isLoading = false;

  // Form controls
  roleName = new FormControl<string>('', [
    zodValidator(roleDraftSchema.shape.name),
  ]);
  roleDescription = new FormControl<string>('', [
    zodValidator(roleDraftSchema.shape.description),
  ]);

  // Handle submit
  public onCreateRoleClick(): void {
    if (this.roleName.invalid || this.roleDescription.invalid) {
      this.msgWrapper.warn('ROLE.INVALID_FORM', {
        source: 'CreateRoleDialog',
        invalidControls: [
          this.roleName.invalid ? 'roleName' : null,
          this.roleDescription.invalid ? 'roleDescription' : null,
        ].filter(Boolean),
      });
      return;
    }

    const trimmedRoleName = this.roleName.value!.trim();
    const trimmedRoleDescription = this.roleDescription.value!.trim();
    this.isLoading = true;

    this.roleService
      .checkRoleName(trimmedRoleName)
      .pipe(
        switchMap((res) => {
          if (res.data) {
            return EMPTY;
          } else {
            return this.roleService.createRole(
              trimmedRoleName,
              trimmedRoleDescription
            );
          }
        }),
        finalize(() => (this.isLoading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.dialogRef.close(res.data);
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CreateRoleDialog',
            stage: 'createRole',
            nameLen: trimmedRoleName.length,
            descLen: trimmedRoleDescription.length,
          }),
      });
  }

  // Handle cancel
  public onCancelClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;

    this.confirmationService.confirm({
      target,
      message: this.translateService.instant(
        'PRIME_CONFIRM.LEAVE_WITHOUT_SAVE_MESSAGE'
      ),
      header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
      icon: 'pi pi-exclamation-triangle',
      closable: true,
      closeOnEscape: true,

      rejectButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
      },
      acceptButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
        severity: 'secondary',
        outlined: true,
      },

      accept: () => this.dialogRef.close(null),
      reject: () => {},
    });
  }
}
