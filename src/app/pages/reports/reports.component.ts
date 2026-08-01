import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Listbox } from 'primeng/listbox';

import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HasOpDirective } from '../../directives/has-op.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageWrapperService } from '../../services/message.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AuthUser } from '../../../../shared/schemas/auth.schema';
import { AuthService } from '../../services/auth.service';
import { ReportsService } from '../../services/reports.service';
import { finalize } from 'rxjs';

type Option = { code: number | string; name: string };

@Component({
  selector: 'app-reports',
  imports: [
    MatCardModule,
    TranslateModule,
    MatGridListModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ProgressSpinner,
    HasOpDirective,
    Listbox,
    MatIconModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent {
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly translateService = inject(TranslateService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly reportsService = inject(ReportsService);
  readonly user = toSignal<AuthUser | null>(this.auth.currentUser$, {
    initialValue: null,
  });
  readonly name = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : null;
  });
  //readonly userName = computed(() => this.user()?.userName ?? null);
  readonly userId = computed(() => this.user()?.id ?? null);
  readonly flag = this.auth.has('VIEW_FULL_REPORTS');

  showSpinner = signal(false);

  frequencies!: Option[];
  types!: Option[];
  years!: Option[];
  months!: Option[];
  quarters!: Option[];

  formGroup!: FormGroup;
  report: number[] | null = null;

  ngOnInit() {
    this.types = [
      { name: 'REPORTS.TYPES.PERSONAL', code: 1 },
      { name: 'REPORTS.TYPES.GENERAL', code: 2 },
    ];
    this.frequencies = [
      { name: 'REPORTS.FREQUENCIES.MONTHLY', code: 'MONTHLY' },
      { name: 'REPORTS.FREQUENCIES.QUARTERLY', code: 'QUARTERLY' },
      { name: 'REPORTS.FREQUENCIES.ANNUAL', code: 'ANNUAL' },
    ];
    this.years = [
      { name: '2026', code: 2026 },
      { name: '2025', code: 2025 },
      { name: '2024', code: 2024 },
      { name: '2023', code: 2023 },
      { name: '2022', code: 2022 },
    ];
    this.quarters = [
      { name: 'REPORTS.QUARTERS.FIRST', code: 1 },
      { name: 'REPORTS.QUARTERS.SECOND', code: 2 },
      { name: 'REPORTS.QUARTERS.THIRD', code: 3 },
      { name: 'REPORTS.QUARTERS.FORTH', code: 4 },
    ];
    this.months = [
      { name: 'REPORTS.MONTHS.JANUARY', code: 1 },
      { name: 'REPORTS.MONTHS.FEBRUARY', code: 2 },
      { name: 'REPORTS.MONTHS.MARCH', code: 3 },
      { name: 'REPORTS.MONTHS.APRIL', code: 4 },
      { name: 'REPORTS.MONTHS.MAY', code: 5 },
      { name: 'REPORTS.MONTHS.JUNE', code: 6 },
      { name: 'REPORTS.MONTHS.JULY', code: 7 },
      { name: 'REPORTS.MONTHS.AUGUST', code: 8 },
      { name: 'REPORTS.MONTHS.SEPTEMBER', code: 9 },
      { name: 'REPORTS.MONTHS.OCTOBER', code: 10 },
      { name: 'REPORTS.MONTHS.NOVEMBER', code: 11 },
      { name: 'REPORTS.MONTHS.DECEMBER', code: 12 },
    ];

    this.formGroup = new FormGroup({
      selectedType: new FormControl<Option | null>(null),
      selectedFrequency: new FormControl<Option | null>(null),
      selectedQuarters: new FormControl<Option[] | null>(null),
      selectedMonths: new FormControl<Option[] | null>(null),
      selectedYears: new FormControl<Option[] | null>(null),
    });
  }

  isFormInvalid(): boolean {
    if (!this.formGroup) return true;

    const {
      selectedType,
      selectedFrequency,
      selectedYears,
      selectedQuarters,
      selectedMonths,
    } = this.formGroup.getRawValue();

    if (!selectedType || !selectedFrequency || !selectedYears?.length) {
      return true;
    }

    if (selectedFrequency.code === 1) {
      return !selectedMonths?.length;
    }

    if (selectedFrequency.code === 2) {
      return !selectedQuarters?.length;
    }

    return false;
  }

  onGenerateClick() {
    this.showSpinner.set(true);
    const {
      selectedType,
      selectedFrequency,
      selectedYears,
      selectedQuarters,
      selectedMonths,
    } = this.formGroup.getRawValue();
    const type = selectedType.code;
    const frequency = selectedFrequency.code;
    const years = selectedYears.map((item: Option) => item.code);
    const quarters = selectedQuarters.value
      ? selectedQuarters.map((item: Option) => item.code)
      : null;
    const months = selectedMonths.value
      ? selectedMonths.map((item: Option) => item.code)
      : null;

    this.reportsService
      .getReport(this.userId(), type, frequency, months, quarters, years)
      .pipe(
        finalize(() => this.showSpinner.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {},
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ReportsComponent',
            stage: 'getReport',
            data: { userId: this.userId, frequency, months, quarters, years },
          }),
      });
  }

  /*   Для Яны:
за 2 квартал
обработано 703* заявки,
в т.ч. 650* с dobroru
отправлено 12598 открыток
приняло участие 445 волонтеров, в т.ч. 26 ОУ, из них 7 впервые (плюс Навигаторы**)
* - неподтвержденные и возвращенные заявки не вычитались.
** - во 2 квартале Навигаторы брали адреса для поздравления с 9 мая - 50 000 адресов. */
}
