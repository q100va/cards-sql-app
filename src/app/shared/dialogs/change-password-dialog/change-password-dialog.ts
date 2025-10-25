import { Component, inject } from '@angular/core';
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
import { UserService } from '../../../services/user.service';
import { MessageWrapperService } from '../../../services/message.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  providers: [],
  selector: 'app-change-password-dialog',
  templateUrl: './change-password-dialog.html',
  styles: ['.full-width { width: 100%; }'],
})
export class ChangePasswordDialogComponent {
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private data = inject<{ userId: number }>(MAT_DIALOG_DATA);
  private userService = inject(UserService);
  private readonly msgWrapper = inject(MessageWrapperService);
  //private json = inject(JsonPipe);
  form = new FormGroup(
    {
      password: new FormControl('', [
        Validators.required,
        Validators.pattern('^(?=.*\\d)(?=.*[A-Za-z]).{8,}$'),
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    {
      validators: (group: AbstractControl): ValidationErrors | null => {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordMismatch: true };
      },
    }
  );

  constructor() {
    this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity();
    });
    this.form.get('confirmPassword')?.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity();
    });
  }

  get passwordMismatch(): boolean {
    return (
      this.form.hasError('passwordMismatch') &&
      this.form.get('confirmPassword')!.touched &&
      !this.form.get('confirmPassword')!.hasError('required')
    );
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
  onSubmit(): void {
    if (this.form.valid) {
      this.userService
        .changePassword(this.data.userId, this.form.get('password')!.value!)
        .subscribe({
          next: () => this.dialogRef.close({ success: true }),
          error: (err) => {
            //this.emitShowSpinner(false);
            this.msgWrapper.handle(err, {
              source: 'ChangePasswordDialogComponent',
              stage: 'onSubmit',
              userId: this.data.userId,
            });
          },
        });
    }
  }
}
