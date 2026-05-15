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
import { MatListModule, MatListOption } from '@angular/material/list';

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
import { Occasion } from '../../../../../shared/schemas/occasion.schema';
import { zodValidator } from '../../../utils/zod-validator';

//Directives
import { HasOpDirective } from '../../../directives/has-op.directive';
import { RecipientService } from '../../../services/recipient.service';
import { HomeService } from '../../../services/home.service';
import { RegionWithHomes } from '../../../../../shared/schemas/home.schema';
import { SeniorService } from '../../../services/senior.service';
import { RecipientsShortList } from '../../../../../shared/schemas/recipient.schema';

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
    MatListModule,
    // Angular forms
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    HasOpDirective,
  ],
  templateUrl: './create-recipient-dialog.component.html',
  styleUrls: ['./create-recipient-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class CreateRecipientDialogComponent {
  // Dependencies
  private readonly destroyRef = inject(DestroyRef);
  readonly dialogRef = inject(MatDialogRef<CreateRecipientDialogComponent>);
  readonly data = inject<Occasion>(MAT_DIALOG_DATA);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly occasionService = inject(OccasionService);
  private readonly homeService = inject(HomeService);
  private readonly recipientService = inject(RecipientService);
  private readonly seniorService = inject(SeniorService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translateService = inject(TranslateService);

  // UI state
  isLoading = false;
  nursingHomeControl = new FormControl<number | null>(null);
  homeGroups: RegionWithHomes = [];
  seniors: RecipientsShortList = [];

  ngOnInit(): void {
    this.isLoading = true;
    this.homeService
      .getHomeGroups()
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.homeGroups = res.data;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CreateRecipientDialog',
            stage: 'getHomeGroups',
            occasionId: this.data.id,
          }),
      });
  }

  onHomeSelected(homeId: number) {
    this.seniors = [];
    if (homeId === null || homeId === undefined) return;
    this.isLoading = true;
    this.seniorService
      .getSeniorsForOccasion(this.data.id, homeId)
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.seniors = res.data;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'CreateRecipientDialog',
            stage: 'onHomeSelected',
            occasionId: this.data.id,
            homeId,
          }),
      });
  }

  // Handle submit
  public onCreateRecipientsClick(options: MatListOption[]): void {
    if (this.nursingHomeControl.value == null || options.length === 0) return;

    this.isLoading = true;

   const recipientsIds = options.map(o => o.value);
console.log('recipientsIds', recipientsIds);
    this.recipientService
      .createRecipients(recipientsIds, this.data.id)
      .pipe(
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
            source: 'CreateRecipientDialog',
            stage: 'createRecipient',
            data: {
              occasion: this.data,
              home: this.nursingHomeControl.value,
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
