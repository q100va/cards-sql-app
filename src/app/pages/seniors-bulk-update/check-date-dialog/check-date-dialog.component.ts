import {
  Component,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
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
import { ErrorType } from '../seniors-bulk-update.component';

type DateCheckMode = 'default' | 'custom' | 'empty' | 'retain';

@Component({
  selector: 'app-check-date-dialog',
  templateUrl: './check-date-dialog.component.html',
  styleUrls: ['./check-date-dialog.component.css'],
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
export class CheckDateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CheckDateDialogComponent>);
  readonly data = inject<{ error: string; type: ErrorType }>(MAT_DIALOG_DATA);

  birthDate = new FormControl<Date | null>(null);
  mode = new FormControl<DateCheckMode>('custom', {
    nonNullable: true,
    validators: [Validators.required],
  });

  form = new FormGroup(
    {
      mode: this.mode,
      birthDate: this.birthDate,
    },
    {
      validators: [this.birthDateRequiredForCustomValidator],
    },
  );
  private birthDateRequiredForCustomValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const mode = control.get('mode')?.value;
    const birthDate = control.get('birthDate')?.value;

    if (!mode) {
      return { modeRequired: true };
    }

    if (mode !== 'custom') {
      return null;
    }

    console.log('birthDate', birthDate);

    if (!birthDate) {
      return { birthDateRequired: true };
    }

    if (birthDate instanceof Date && !Number.isNaN(birthDate.getTime())) {
      return null;
    }

    if (
      typeof birthDate === 'object' &&
      typeof birthDate.isValid === 'function' &&
      birthDate.isValid()
    ) {
      return null;
    }

    return { birthDateInvalid: true };
  }
  defaultActions = {
    NO_DAY: {
      label: 'SENIOR.DIALOG.CHECK_DATE.ACTION_DEFAULT_DAY',
      value: 15,
      name: 'day',
    },
    WRONG_DAY: {
      label: 'SENIOR.DIALOG.CHECK_DATE.ACTION_DEFAULT_DAY',
      value: 15,
      name: 'day',
    },
    NO_MONTH: {
      label: 'SENIOR.DIALOG.CHECK_DATE.ACTION_DEFAULT_MONTH',
      value: 7,
      name: 'month',
    },
    WRONG_MONTH: {
      label: 'SENIOR.DIALOG.CHECK_DATE.ACTION_DEFAULT_MONTH',
      value: 7,
      name: 'month',
    },
    WRONG_YEAR: {
      label: 'SENIOR.DIALOG.CHECK_DATE.ACTION_DEFAULT_YEAR',
      value: 1800,
      name: 'year',
    },
    STRANGE_YEAR: {
      label: 'SENIOR.DIALOG.CHECK_DATE.ACTION_DEFAULT_YEAR',
      value: 1800,
      name: 'year',
    },
  };

  ngOnInit() {
    //console.log('data', this.data.error);
  }

  onApplyClick() {
    this.dialogRef.close({
      action: this.mode.value,
      value:
        this.mode.value === 'default'
          ? {
              [this.defaultActions[this.data.type].name]:
                this.defaultActions[this.data.type].value,
            }
          : null,
      birthDate: this.birthDate.value
        ? new Date(this.birthDate.value)
        : this.birthDate.value,
    });
  }
  onCancelClick() {
    this.dialogRef.close(false);
  }

  onModeChange(mode: string) {
    if (mode === 'custom') this.birthDate.enable();
    else this.birthDate.disable();
  }
}
