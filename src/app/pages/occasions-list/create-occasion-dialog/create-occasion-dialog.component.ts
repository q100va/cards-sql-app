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
} from '@angular/material/dialog';

// Forms and validation
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

// Material UI modules
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';

// Services
import { OccasionService } from '../../../services/occasion.service';
import { ConfirmationService } from 'primeng/api';
import { MessageWrapperService } from '../../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// RxJS
import { EMPTY } from 'rxjs';
import { switchMap, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Validation
import {
  monthIdSchema,
  occasionDraftSchema,
} from '../../../../../shared/schemas/occasion.schema';
import { zodValidator } from '../../../utils/zod-validator';

import {
  MONTHS,
  STATUSES,
  OCCASION_TYPES,
  YEARS,
} from '../../../../../shared/constants/occasions';

//Directives
import { HasOpDirective } from '../../../directives/has-op.directive';

export function occasionMonthByTypeValidator(
  birthdayTypeId: number,
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const type = group.get('occasionType')?.value as number | null;
    const month = group.get('occasionMonth')?.value as number | null;

    if (type === birthdayTypeId && month === null) {
      return { occasionMonthRequiredForBirthday: true };
    }

    if (type !== birthdayTypeId && month !== null) {
      return { occasionMonthMustBeNullForNonBirthday: true };
    }

    return null;
  };
}

export type OccasionFormControls = {
  occasionYear: FormControl<number | null>;
  occasionType: FormControl<number | null>;
  occasionStatus: FormControl<number>;
  occasionMonth?: FormControl<number | null>;
};

@Component({
  selector: 'app-create-occasion-dialog',
  imports: [
    // Material dialog
    MatDialogActions,
    MatDialogContent,
    // Material form + UI
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatGridListModule,
    MatIconModule,
    MatSelectModule,
    MatRadioModule,
    // Angular forms
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    HasOpDirective,
  ],
  templateUrl: './create-occasion-dialog.component.html',
  styleUrls: ['./create-occasion-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CreateOccasionDialogComponent {
  // Dependencies
  private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<CreateOccasionDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly occasionService = inject(OccasionService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translateService = inject(TranslateService);

  // UI state
  isLoading = false;
  occasionName = '';
  MONTHS = MONTHS;
  TYPES = OCCASION_TYPES;
  YEARS = YEARS;
  STATUSES = STATUSES;

  // Form controls

  occasionForm = new FormGroup<OccasionFormControls>({
    occasionYear: new FormControl<number | null>(null, {
      nonNullable: true,
      validators: [zodValidator(occasionDraftSchema.shape.year)],
    }),
    occasionType: new FormControl<number | null>(null, [
      zodValidator(occasionDraftSchema.shape.type),
    ]),
    occasionStatus: new FormControl<number>(1, {
      nonNullable: true,
      validators: [zodValidator(occasionDraftSchema.shape.status)],
    }),
  });

  get occasionMonth(): FormControl<number | null> | null {
    return this.occasionForm.get('occasionMonth') as FormControl<
      number | null
    > | null;
  }

  private createOccasionMonthControl(): FormControl<number | null> {
    return new FormControl<number | null>(null, [zodValidator(monthIdSchema)]);
  }

  private addOccasionMonthControl(): void {
    if (!this.occasionForm.contains('occasionMonth')) {
      this.occasionForm.addControl(
        'occasionMonth',
        this.createOccasionMonthControl(),
      );
    }
  }

  private removeOccasionMonthControl(): void {
    if (this.occasionForm.contains('occasionMonth')) {
      this.occasionForm.removeControl('occasionMonth');
    }
  }

  ngOnInit(): void {
    const birthdayTypeId = 1;

    this.occasionForm.controls.occasionType.valueChanges.subscribe((type) => {
      if (type === birthdayTypeId) {
        this.addOccasionMonthControl();
      } else {
        this.removeOccasionMonthControl();
      }
    });
  }

  // Handle submit
  public onCreateOccasionClick(): void {
    if (
      this.occasionForm.controls.occasionType.value == null ||
      this.occasionForm.controls.occasionYear.value == null
    )
      return;

    const type = this.occasionForm.controls.occasionType.value;
    const year = this.occasionForm.controls.occasionYear.value;
    const month = this.occasionForm.controls.occasionMonth
      ? this.occasionForm.controls.occasionMonth.value
      : null;
    const status = this.occasionForm.controls.occasionStatus.value;

    this.isLoading = true;

    this.occasionService
      .checkOccasionData({ type, year, month })
      .pipe(
        switchMap((res) => {
          if (res.data) {
            return EMPTY;
          } else {
            return this.occasionService.createOccasion({
              type,
              month,
              year,
              status,
            });
          }
        }),
        finalize(() => (this.isLoading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res) {
            this.dialogRef.close(res.data);
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CreateOccasionDialog',
            stage: 'createOccasion',
            object: {
              type,
              month,
              year,
              status,
            },
          }),
      });
  }

  // Handle cancel
  public onCancelClick(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;

    this.confirmationService.confirm({
      target,
      message: this.translateService.instant(
        'PRIME_CONFIRM.LEAVE_WITHOUT_SAVE_MESSAGE',
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
