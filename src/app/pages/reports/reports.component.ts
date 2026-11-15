import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Listbox } from 'primeng/listbox';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { z } from 'zod';

import { MessageWrapperService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { ReportsService } from '../../services/reports.service';
import { FileService } from '../../services/file.service';
import { AuthUser } from '../../../../shared/schemas/auth.schema';
import type {
  reportDTOSchema,
  ReportGeneralRow,
  ReportResponse,
} from '../../../../shared/schemas/report.schema';
import {
  REPORT_FREQUENCY,
  REPORT_TYPE,
  REPORT_TYPES,
} from '../../../../shared/constants/reports';
import { FIRST_OCCASION_YEAR } from '../../../../shared/constants/occasions';

type ReportRequest = z.infer<typeof reportDTOSchema>;
type ReportType = ReportRequest['type'];
type ReportFrequency = ReportRequest['frequency'];

type ReportOption<Code extends number | string> = {
  code: Code;
  name: string;
  labelKey?: string;
  disabledForOccasion?: boolean;
};

type PeriodOption = ReportOption<number>;
type ReportFormControls = {
  selectedType: FormControl<ReportOption<ReportType> | null>;
  selectedFrequency: FormControl<ReportOption<ReportFrequency> | null>;
  selectedYears: FormControl<PeriodOption[] | null>;
  selectedMonths: FormControl<PeriodOption[] | null>;
  selectedQuarters: FormControl<PeriodOption[] | null>;
};

@Component({
  selector: 'app-reports',
  imports: [
    MatCardModule,
    TranslateModule,
    MatGridListModule,
    ReactiveFormsModule,
    ProgressSpinner,
    Listbox,
    MatIconModule,
    TableModule,
    ButtonModule,
    MatButtonModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly reportsService = inject(ReportsService);
  private readonly fileService = inject(FileService);
  private readonly user = toSignal<AuthUser | null>(this.auth.currentUser$, {
    initialValue: null,
  });
  private readonly userId = computed(() => this.user()?.id ?? null);

  readonly reportTypes = REPORT_TYPE;
  readonly reportFrequencies = REPORT_FREQUENCY;
  readonly showSpinner = signal(false);
  isExporting = false;

  private readonly languageVersion = signal(0);
  readonly types = computed<ReportOption<ReportType>[]>(() => {
    this.languageVersion();
    const hasFull = this.auth.has('VIEW_FULL_REPORTS');
    const hasLimited = this.auth.has('VIEW_LIMITED_REPORTS');

    const allowedTypes: ReportType[] = [
      ...(hasFull ? [REPORT_TYPE.GENERAL] : []),
      REPORT_TYPE.PERSONAL,
      ...(hasFull || hasLimited ? [REPORT_TYPE.SCHOOL_COORDINATION] : []),
      ...(hasFull ? [REPORT_TYPE.BY_OCCASION] : []),
    ];

    return allowedTypes.map((type) =>
      this.option(type, REPORT_TYPES[type].key),
    );
  });
  frequencies: ReportOption<ReportFrequency>[] = [];
  years: PeriodOption[] = [];
  months: PeriodOption[] = [];
  quarters: PeriodOption[] = [];

  readonly formGroup = new FormGroup<ReportFormControls>({
    selectedType: new FormControl<ReportOption<ReportType> | null>(null),
    selectedFrequency: new FormControl<ReportOption<ReportFrequency> | null>(
      null,
    ),
    selectedYears: new FormControl<PeriodOption[] | null>(null),
    selectedMonths: new FormControl<PeriodOption[] | null>(null),
    selectedQuarters: new FormControl<PeriodOption[] | null>(null),
  });

  report: ReportResponse['report'] = [];
  cols: ReportResponse['cols'] = [];
  reportType: ReportType | null = null;
  emptyMessage = '';
  private requestVersion = 0;

  get reportName(): string {
    return this.reportType === null
      ? ''
      : this.translateService.instant(REPORT_TYPES[this.reportType].key);
  }

  constructor() {
    effect(() => {
      const allowed = this.types();
      const selected = this.formGroup.controls.selectedType.value;

      const selectedDenied =
        selected && !allowed.some((type) => type.code === selected.code);

      const reportDenied =
        this.reportType !== null &&
        !allowed.some((type) => type.code === this.reportType);

      if (!selectedDenied && !reportDenied) return;

      if (selectedDenied) {
        this.formGroup.controls.selectedType.setValue(null);
      }

      this.report = [];
      this.cols = [];
      this.reportType = null;
      this.emptyMessage = '';
      this.requestVersion++;
      this.showSpinner.set(false);
    });
  }

  ngOnInit() {
    this.frequencies = [
      this.option(
        REPORT_FREQUENCY.MONTHLY,
        'REPORTS.FREQUENCIES.MONTHLY',
        true,
      ),
      this.option(
        REPORT_FREQUENCY.QUARTERLY,
        'REPORTS.FREQUENCIES.QUARTERLY',
        true,
      ),
      this.option(REPORT_FREQUENCY.ANNUAL, 'REPORTS.FREQUENCIES.ANNUAL', false),
    ];
    const currentYear = new Date().getFullYear();
    this.years = Array.from(
      { length: currentYear - FIRST_OCCASION_YEAR + 1 },
      (_, index) => ({
        code: currentYear - index,
        name: String(currentYear - index),
      }),
    );
    this.quarters = ['FIRST', 'SECOND', 'THIRD', 'FORTH'].map((key, index) =>
      this.option(index + 1, `REPORTS.QUARTERS.${key}`),
    );
    this.months = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ].map((key, index) => this.option(index + 1, `REPORTS.MONTHS.${key}`));

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.languageVersion.update((version) => version + 1);
        this.frequencies = this.translateOptions(this.frequencies);
        this.months = this.translateOptions(this.months);
        this.quarters = this.translateOptions(this.quarters);
      });
  }

  private option<Code extends number | string>(
    code: Code,
    labelKey: string,
    disabledForOccasion?: boolean,
  ): ReportOption<Code> {
    return {
      code,
      labelKey,
      name: this.translateService.instant(labelKey),
      disabledForOccasion,
    };
  }

  private translateOptions<Code extends number | string>(
    options: ReportOption<Code>[],
  ): ReportOption<Code>[] {
    // Keep selected option objects while refreshing labels and the listbox input array.
    return options.map((option) => {
      if (option.labelKey)
        option.name = this.translateService.instant(option.labelKey);
      return option;
    });
  }

  isFormInvalid(): boolean {
    return this.buildRequest() === null;
  }

  private buildRequest(): ReportRequest | null {
    const {
      selectedType,
      selectedFrequency,
      selectedYears,
      selectedMonths,
      selectedQuarters,
    } = this.formGroup.getRawValue();
    if (!selectedType || !selectedFrequency || !selectedYears?.length)
      return null;
    const type = selectedType.code;
    const frequency = selectedFrequency.code;
    if (frequency === REPORT_FREQUENCY.MONTHLY && !selectedMonths?.length)
      return null;
    if (frequency === REPORT_FREQUENCY.QUARTERLY && !selectedQuarters?.length)
      return null;

    return {
      userId: type === REPORT_TYPE.PERSONAL ? this.userId() : null,
      type,
      frequency,
      months:
        frequency === REPORT_FREQUENCY.MONTHLY
          ? (selectedMonths?.map((option) => option.code) ?? null)
          : null,
      quarters:
        frequency === REPORT_FREQUENCY.QUARTERLY
          ? (selectedQuarters?.map((option) => option.code) ?? null)
          : null,
      years: selectedYears.map((option) => option.code),
    };
  }

  onGenerateClick() {
    const request = this.buildRequest();
    if (!request) return;
    // Form edits keep the preview; only an accepted Generate action takes ownership.
    const version = ++this.requestVersion;
    const actorId = this.userId();
    this.showSpinner.set(true);
    this.report = [];
    this.cols = [];
    this.reportType = null;
    this.emptyMessage = '';

    this.reportsService
      .getReport(
        request.userId,
        request.type,
        request.frequency,
        request.months,
        request.quarters,
        request.years,
      )
      .pipe(
        finalize(() => {
          if (version === this.requestVersion) this.showSpinner.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ data }) => {
          if (version !== this.requestVersion) return;
          this.report = data.report;
          this.cols = data.cols;
          this.reportType = data.type;
          this.emptyMessage = data.report.length
            ? ''
            : 'REPORTS.TABLE.EMPTY_MESSAGE';
        },
        error: (error: unknown) => {
          if (version !== this.requestVersion) return;
          this.msgWrapper.handle(error, {
            source: 'ReportsComponent',
            stage: 'getReport',
            data: {
              userId: actorId,
              frequency: request.frequency,
              months: request.months,
              quarters: request.quarters,
              years: request.years,
            },
          });
        },
      });
  }

  getPeriod(period: ReportGeneralRow['periodData']): string {
    const quarter =
      this.quarters.find((option) => option.code === period.quarter)?.name ??
      '';
    const month =
      this.months.find((option) => option.code === period.month)?.name ?? '';
    return [month, quarter, period.year].filter(Boolean).join(' ').trim();
  }

  getOccasionName(occasion: string): string {
    return String(occasion ?? '')
      .split(' ')
      .filter(Boolean)
      .map((part) =>
        /^\d+$/.test(part) ? part : this.translateService.instant(part),
      )
      .join(' ');
  }

  onChangeTypeSelection() {
    if (
      this.formGroup.controls.selectedType.value?.code ===
      REPORT_TYPE.BY_OCCASION
    ) {
      this.formGroup.controls.selectedFrequency.setValue(null);
      this.formGroup.controls.selectedMonths.setValue([]);
      this.formGroup.controls.selectedQuarters.setValue([]);
    }
  }

  onChangeFrequenciesSelection() {
    const frequency = this.formGroup.controls.selectedFrequency.value?.code;
    if (
      frequency === REPORT_FREQUENCY.ANNUAL ||
      frequency === REPORT_FREQUENCY.QUARTERLY
    ) {
      this.formGroup.controls.selectedMonths.setValue([]);
    }
    if (
      frequency === REPORT_FREQUENCY.ANNUAL ||
      frequency === REPORT_FREQUENCY.MONTHLY
    ) {
      this.formGroup.controls.selectedQuarters.setValue([]);
    }
  }

  async exportToExcel(): Promise<void> {
    if (!this.report.length || !this.cols.length || this.isExporting) return;
    this.isExporting = true;
    try {
      const data =
        this.reportType === REPORT_TYPE.GENERAL
          ? this.report.flatMap((item) => {
              if (!('occasions' in item))
                throw new Error('General report row is missing occasion data');
              const { occasions, ...parent } = item;
              return [
                {
                  ...parent,
                  rowType: 'period' as const,
                  periodData: this.getPeriod(item.periodData),
                },
                ...occasions.map((occasion) => ({
                  ...occasion,
                  rowType: 'occasion' as const,
                  periodData: this.getOccasionName(occasion.occasionName),
                })),
              ];
            })
          : this.report.map((item) => ({
              ...item,
              periodData:
                'periodData' in item ? this.getPeriod(item.periodData) : null,
              occasionName:
                'occasionName' in item
                  ? this.getOccasionName(item.occasionName)
                  : null,
            }));
      const columns = this.cols.map((column) => ({
        field: column.field,
        header: this.translateService.instant(column.header),
      }));
      await this.fileService.export(data, columns, {
        fileName: `${this.reportName}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Report',
      });
    } finally {
      this.isExporting = false;
    }
  }
}
