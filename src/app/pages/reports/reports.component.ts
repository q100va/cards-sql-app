import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Listbox, ListboxChangeEvent } from 'primeng/listbox';

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
import { ReportRow } from '../../../../shared/schemas/report.schema';

type Option = {
  code: number | string;
  name: string;
  disabledForOccasion?: boolean;
};

@Component({
  selector: 'app-reports',
  imports: [
    MatCardModule,
    TranslateModule,
    MatGridListModule,
    FormsModule,
    ReactiveFormsModule,
    ProgressSpinner,
    HasOpDirective,
    Listbox,
    MatIconModule,
    TableModule,
    ButtonModule,
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
  frequenciesShortList!: Option[];

  formGroup!: FormGroup;
  report: ReportRow[] = [];
  reportName: string = '';
  reportType: number = 0;
  emptyMessage: string = '';

  cols!: {
    field: string;
    header: string;
  }[];

  ngOnInit() {
    //TODO: Dynamic translation
    this.types = [
      { name: 'REPORTS.TYPES.GENERAL', code: 1 }, //2
      { name: 'REPORTS.TYPES.PERSONAL', code: 2 }, //3
      { name: 'REPORTS.TYPES.SCHOOL_COORDINATION', code: 3 }, //1
      { name: 'REPORTS.TYPES.BY_OCCASION', code: 4 },
    ].map((i) => ({
      name: this.translateService.instant(i.name),
      code: i.code,
    }));
    this.frequencies = [
      {
        name: 'REPORTS.FREQUENCIES.MONTHLY',
        code: 'MONTHLY',
        disabledForOccasion: true,
      },
      {
        name: 'REPORTS.FREQUENCIES.QUARTERLY',
        code: 'QUARTERLY',
        disabledForOccasion: true,
      },
      {
        name: 'REPORTS.FREQUENCIES.ANNUAL',
        code: 'ANNUAL',
        disabledForOccasion: false,
      },
    ].map((i) => ({
      name: this.translateService.instant(i.name),
      code: i.code,
      disabledForOccasion: i.disabledForOccasion,
    }));

    /*     this.frequenciesShortList = [
      { name: 'REPORTS.FREQUENCIES.ANNUAL', code: 'ANNUAL' },
    ]; */
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
    ].map((i) => ({
      name: this.translateService.instant(i.name),
      code: i.code,
    }));
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
    ].map((i) => ({
      name: this.translateService.instant(i.name),
      code: i.code,
    }));

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

    if (selectedFrequency.code === 'MONTHLY') {
      return !selectedMonths?.length;
    }

    if (selectedFrequency.code === 'QUARTERLY') {
      return !selectedQuarters?.length;
    }

    return false;
  }

  onGenerateClick() {
    this.showSpinner.set(true);
    this.emptyMessage = '';
    this.report = [];
    this.reportName = '';
    this.reportType = 0;
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
    const quarters = selectedQuarters
      ? selectedQuarters.map((item: Option) => item.code)
      : null;
    const months = selectedMonths
      ? selectedMonths.map((item: Option) => item.code)
      : null;

    this.reportsService
      .getReport(
        type === 1 || type === 4 ? null : this.userId(),
        type,
        frequency,
        months,
        quarters,
        years,
      )
      .pipe(
        finalize(() => this.showSpinner.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.emptyMessage = res.data.report.length ? '' : 'REPORTS.TABLE.EMPTY_MESSAGE';
          this.report = res.data.report;
          console.log('this.report', res.data);
          this.cols = res.data.cols;
          this.reportName = this.types[res.data.type - 1].name;
          this.reportType = res.data.type;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ReportsComponent',
            stage: 'getReport',
            data: { userId: this.userId, frequency, months, quarters, years },
          }),
      });
  }

  getPeriod(periodData: { year: number; quarter: number; month: number }) {
    const year = periodData['year'] ?? '';
    const quarter = periodData['quarter']
      ? this.translateService.instant(
          this.quarters[periodData['quarter'] - 1].name,
        )
      : '';
    const month = periodData['month']
      ? this.translateService.instant(this.months[periodData['month'] - 1].name)
      : '';
    return [month, quarter, year].filter(Boolean).join(' ').trim();
  }

  getOccasionName(occasion: string) {
    return String(occasion ?? '')
      .split(' ')
      .filter(Boolean)
      .map((part) =>
        /^\d+$/.test(part) ? part : this.translateService.instant(part),
      )
      .join(' ');
  }

  onChangeTypeSelection(event: ListboxChangeEvent) {
    console.log('event', event);
    if (event.value?.code === 4) {
      this.formGroup.controls['selectedFrequency'].setValue({
        name: 'REPORTS.FREQUENCIES.ANNUAL',
        code: 'ANNUAL',
        disabledForOccasion: false,
      });
      this.formGroup.controls['selectedMonths'].setValue([]);
      this.formGroup.controls['selectedQuarters'].setValue([]);
    }
  }

  onChangeFrequenciesSelection(event: ListboxChangeEvent) {
    console.log('event', event);
    if (event.value?.code === 'ANNUAL') {
      this.formGroup.controls['selectedMonths'].setValue([]);
      this.formGroup.controls['selectedQuarters'].setValue([]);
    }
    if (event.value?.code === 'QUARTERLY') {
      this.formGroup.controls['selectedMonths'].setValue([]);
    }
    if (event.value?.code === 'MONTHLY') {
      this.formGroup.controls['selectedQuarters'].setValue([]);
    }
  }
}

/*   Для Яны:
за 2 квартал
обработано 703* заявки,
в т.ч. 650* с dobroru
отправлено 12598 открыток
приняло участие 445 волонтеров, в т.ч. 26 ОУ, из них 7 впервые (плюс Навигаторы**)
* - неподтвержденные и возвращенные заявки не вычитались.
** - во 2 квартале Навигаторы брали адреса для поздравления с 9 мая - 50 000 адресов. */

/* Для Татьяны:
за 2 квартал

отправлено открыток 39699* + 43848** + 6166*** => 89 713 штук
поздравлено 18901 + 24947** + 6166***  => 50 014 человек
из 324 (+66***) интернатов в 73 регионах
участвовало 1753* волонтера, в т.ч. 219 организаций, из них 74 ОУ, плюс Навигаторы
* - неподтвержденные и возвращенные заявки НЕ учитывались
** - только Навигаторы с 9 мая
*** - неактивные интернаты, которых поздравили Навигаторы с 9 мая */

/* В поздравлении открытками за Х квартал:
- приняло участие ХХХ учреждения из ХХ регионов,
ДИПИ-?  Регионы?
Социальные дома (бывшие ПНИ)-? Регионы?
КЦСОН,ЦСО(надомники)-? Регионы?
- всего поздравили открытками ХХХ человек, отправили ХХХ открыток,
- с ДР, с НГ, с 9 Мая, поздравили ХХХ человек, отправили ХХХ открыток,
в поздравлениях приняли участие более ХХХ поздравляющих, в т.ч. ХХХ образовательных учреждения и ХХХ организаций

1) Нужны данные в приложении
2) Нужны данные с выгрузкой в Excel
3) Нужны ежемесячные и квартальные отчёты
4) Срок выгрузки отчтётов - на 1 число каждого месяца
 */
