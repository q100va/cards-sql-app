import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { zodValidator } from '../../../utils/zod-validator';
import { seniorDraftSchema, SeniorRow } from '../../../../../shared/schemas/senior.schema';

@Component({
  selector: 'app-check-gender-dialog',
  templateUrl: './check-gender-dialog.component.html',
  styleUrls: ['./check-gender-dialog.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatRadioModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDatepickerModule,
    TranslateModule,
    ReactiveFormsModule,
  ],
})
export class CheckGenderDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CheckGenderDialogComponent>);
  readonly data = inject<{ error: string; senior: SeniorRow }>(MAT_DIALOG_DATA);
  firstName = new FormControl<string>(
    { value: this.data.senior.firstName, disabled: false },
    {
      nonNullable: true,
      validators: [zodValidator(seniorDraftSchema.shape.firstName)],
    },
  );

  patronymic = new FormControl<string | null>(
    { value: this.data.senior.patronymic ?? null, disabled: false },
    {
      validators: [zodValidator(seniorDraftSchema.shape.patronymic)],
    },
  );
  lastName = new FormControl<string | null>(
    { value: this.data.senior.lastName ?? null, disabled: false },
    {
      validators: [zodValidator(seniorDraftSchema.shape.lastName)],
    },
  );
  gender = new FormControl<'male' | 'female' | null>(
    { value: null, disabled: false },
    {
      nonNullable: true,
      validators: [zodValidator(seniorDraftSchema.shape.gender)],
    },
  );

  form = new FormGroup({
    firstName: this.firstName,
    patronymic: this.patronymic,
    lastName: this.lastName,
    gender: this.gender,
  });

  ngOnInit() {
    //console.log('data', this.data.error);
  }

  onApplyClick() {
    this.dialogRef.close({
      firstName: this.firstName.value,
      patronymic: this.patronymic.value,
      lastName: this.lastName.value,
      gender: this.gender.value,
    });
  }
  onCancelClick() {
    this.dialogRef.close(false);
  }
}
