// src/app/pages/user-details/change-password-dialog/change-password-dialog.ts
import { Component, DestroyRef, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';

import { UserService } from '../../../services/user.service';
import { MessageWrapperService } from '../../../services/message.service';
import { userDraftSchema } from '@shared/schemas/user.schema';
import { zodValidator } from 'src/app/utils/zod-validator';

type DialogData = { userId: number };

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslateModule,
  ],
  styles: ['.full-width { width: 100%; }'],
  templateUrl: './change-password-dialog.html',
})
export class ChangePasswordDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly userService = inject(UserService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly destroyRef = inject(DestroyRef);

  // Cross-field validator: confirm must match password
  private static matchValidator(group: AbstractControl): ValidationErrors | null {
    const pwd = group.get('password')?.value ?? '';
    const confirm = group.get('confirmPassword')?.value ?? '';
    return pwd === confirm ? null : { passwordMismatch: true };
  }

  form = new FormGroup(
    {
      password: new FormControl<string>('', {
        nonNullable: true,
        validators: [zodValidator(userDraftSchema.shape.password)],
      }),
      confirmPassword: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: ChangePasswordDialogComponent.matchValidator }
  );

  constructor() {
    // Re-run cross-field validation whenever either field changes
    merge(
      this.form.controls.password.valueChanges,
      this.form.controls.confirmPassword.valueChanges
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false }));
  }

  get passwordMismatch(): boolean {
    return (
      this.form.hasError('passwordMismatch') &&
      this.form.controls.confirmPassword.touched &&
      !this.form.controls.confirmPassword.hasError('required')
    );
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const newPassword = this.form.controls.password.value;
    this.userService
      .changePassword(this.data.userId, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.dialogRef.close({ success: true }),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ChangePasswordDialogComponent',
            stage: 'onSubmit',
            userId: this.data.userId,
          }),
      });
  }
}
