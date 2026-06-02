import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { UploadFileComponent } from '../../shared/upload-file/upload-file.component';
import { ProgressSpinner } from 'primeng/progressspinner';

//import { ButtonModule } from 'primeng/button';
import { TableModule, TableRowSelectEvent } from 'primeng/table';
import { HasOpDirective } from '../../directives/has-op.directive';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { CheckDateDialogComponent } from './check-date-dialog/check-date-dialog.component';
import { CheckGenderDialogComponent } from './check-gender-dialog/check-gender-dialog.component';

import { finalize, firstValueFrom, map, Observable } from 'rxjs';
import { MessageWrapperService } from '../../services/message.service';
import { SeniorService } from '../../services/senior.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Differences,
  SeniorRow,
  SeniorRaw,
  SeniorChanges,
  SeniorDiff,
  AcceptedChanges,
} from '../../../../shared/schemas/senior.schema';
import { DateUtilsService } from '../../services/date-utils.service';
import { SeniorChangesTableComponent } from './senior-changes-table/senior-changes-table.component';
import { MONTHS } from '../../../../shared/constants/occasions';

/* export interface SeniorRow {
  nursingHome: string;
  lastName?: string | null;
  firstName: string;
  patronymic?: string | null;
  dateOfConsent?: string | null;
  dayBirthday?: number | null;
  monthBirthday?: number | null;
  yearBirthday?: number | null;
  gender?: 'male' | 'female' | null;
  birthDate?: string | null;
  comment?: string | null;
  infoNote?: string | null;
  photoLink?: string | null;
  kindergarten?: string | null;
  teacher?: string | null;
  veteran?: string | null;
  childOfWar?: string | null;
  profession?: string | null;
  honoraryStatus?: string | null;
  interests?: string | null;
  orthodoxBeliever?: string | null;
} */
export type ErrorType =
  | 'NO_DAY'
  | 'NO_MONTH'
  | 'WRONG_DAY'
  | 'WRONG_MONTH'
  | 'WRONG_YEAR'
  | 'STRANGE_YEAR';

@Component({
  selector: 'app-seniors-bulk-update',
  imports: [
    CommonModule,
    UploadFileComponent,
    ProgressSpinner,
    HasOpDirective,
    MatCardModule,
    TranslateModule,
    MatGridListModule,
    TableModule,
    MatButtonModule,
    MatRadioModule,
    FormsModule,
    SeniorChangesTableComponent,
    MatSelectModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    //ButtonModule
  ],
  templateUrl: './seniors-bulk-update.component.html',
  styleUrl: './seniors-bulk-update.component.css',
})
export class SeniorsBulkUpdateComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly translateService = inject(TranslateService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly seniorService = inject(SeniorService);
  readonly dateUtils = inject(DateUtilsService);
  readonly dialog = inject(MatDialog);
  showSpinner = signal(false);
  isCompleted = false;
  arrayOfLists: {
    homeName: string;
    list: SeniorRow[];
  }[] = [];
  //isStarted = false;
  currentHomeName = '';
  home!: {
    homeName: string;
    list: SeniorRow[];
  };
  MONTHS = MONTHS;

  newSeniors: SeniorRaw[] = [];
  removedSeniors: SeniorRaw[] = [];
  updatedSeniors: SeniorDiff[] = [];
  possibleDuplicates: SeniorDiff[] = [];
  returnedSeniors: SeniorDiff[] = [];

  selectedRemovedSenior: SeniorRaw | null = null;
  selectedNewSenior: SeniorRaw | null = null;
  selectedRemovedSeniorIndex: number | null = null;
  selectedNewSeniorIndex: number | null = null;

  admitted: SeniorRaw[] = [];
  removed: SeniorRaw[] = [];
  updated: { seniorId: number; changes: AcceptedChanges }[] = [];
  currentHomeId!: number;
  index = 0;

  dateOfUpdate = new FormControl<Date | null>(null, [Validators.required]);
  chosenMonths = new FormControl<number[]>([], { nonNullable: true });
  commentsMode = new FormControl<boolean>(true, { nonNullable: true });
  noChanges = false;
  showStart = false;
  constructor() {}
  ngOnInit() {
    // this.commentsMode.setValue(true);
  }

  parseRows(rows: SeniorRow[]) {
    this.isCompleted = false;
    this.commentsMode.disable();
    // this.toggleDisabled = true;
    this.index = 0;
    this.clear();
    //this.isStarted = false;

    this.showSpinner.set(false);

    const setNursingHome = new Set(rows.map((r) => r.nursingHome));
    this.arrayOfLists = [];

    for (let name of setNursingHome) {
      this.arrayOfLists.push({
        homeName: name,
        list: rows.filter((item) => item.nursingHome === name),
      });
    }
    this.processHome();
  }

  private async processHome(): Promise<void> {
    console.log('processHomes', this.index, this.arrayOfLists[this.index]);
    if (this.index > this.arrayOfLists.length - 1) {
      this.commentsMode.enable();
      this.isCompleted = true;
      this.msgWrapper.success('SENIOR.BULK_UPDATE.COMPLETED');
      return;
    }
    //this.isStarted = true;
    this.home = this.arrayOfLists[this.index];

    this.currentHomeName = this.home.homeName;

    this.home.list = this.home.list.map((senior) => this.normalize(senior));

    for (const senior of this.home.list) {
      const result = await this.validate(senior);
      if (result === false) {
        this.index = 0;
        this.clear();
        this.commentsMode.enable();
        this.isCompleted = true;
        return;
      }
    }

    const result = this.deleteDuplicates(this.home.list);
    this.home.list = result.cleaned;
    if (result.duplicatesMessage) {
      this.msgWrapper.info('SENIOR.BULK_UPDATE.DELETED_DUPLICATES', undefined, {
        duplicates: result.duplicatesMessage,
      });
    }

    this.showStart = true;
  }

  async onStartClick() {
    this.showStart = false;
    this.chosenMonths.disable();

    const data: Differences = await this.compareLists(
      this.home.list,
      this.home.homeName,
    );
    this.newSeniors = data.differences.newSeniors;
    this.removedSeniors = data.differences.removedSeniors;
    this.updatedSeniors = data.differences.updatedSeniors;
    this.possibleDuplicates = data.differences.possibleDuplicates;
    this.returnedSeniors = data.differences.returnedSeniors;
    this.currentHomeId = data.homeId;
    if (
      this.newSeniors.length === 0 &&
      this.removedSeniors.length === 0 &&
      this.updatedSeniors.length === 0 &&
      this.possibleDuplicates.length === 0 &&
      this.returnedSeniors.length === 0
    )
      this.noChanges = true;
    console.log('this.newSeniors', this.newSeniors);
  }

  private normalizeName(name: string | null): string | null {
    if (name == null) return null;

    const normalized = name.trim().toLowerCase().replaceAll('ё', 'е');

    if (!normalized) return null;

    return normalized.replace(/(^|[\s-])(\p{L})/gu, (_, prefix, char) => {
      return prefix + char.toUpperCase();
    });
  }

  private normalize(senior: SeniorRow) {
    const normalizeFirstName = this.normalizeName(senior.firstName);
    if (normalizeFirstName) senior.firstName = normalizeFirstName;
    senior.lastName = this.normalizeName(senior.lastName ?? null);
    senior.patronymic = this.normalizeName(senior.patronymic ?? null);
    senior.dateOfConsent = senior.dateOfConsent ?? null;
    senior.dayBirthday = senior.dayBirthday ?? null;
    senior.monthBirthday = senior.monthBirthday ?? null;
    senior.yearBirthday = senior.yearBirthday
      ? senior.yearBirthday
      : senior.dayBirthday !== null && senior.monthBirthday !== null
        ? 1800
        : null;

    senior.gender = this.getGender(senior);
    return senior;
  }

  private getGender(senior: SeniorRow): 'male' | 'female' | null {
    if (senior.patronymic && senior.lastName) {
      if (
        (senior.patronymic.endsWith('ич') ||
          senior.patronymic.endsWith('оглы') ||
          senior.patronymic.endsWith('Оглы')) &&
        (senior.lastName.endsWith('ова') ||
          senior.lastName.endsWith('ева') ||
          senior.lastName.endsWith('ина'))
      )
        return null;
      if (
        (senior.patronymic.endsWith('на') ||
          senior.patronymic.endsWith('кызы') ||
          senior.patronymic.endsWith('Кызы')) &&
        (senior.lastName.endsWith('ов') ||
          senior.lastName.endsWith('ев') ||
          senior.lastName.endsWith('ин'))
      )
        return null;
    }
    if (
      senior.patronymic &&
      (senior.patronymic.endsWith('ич') ||
        senior.patronymic.endsWith('оглы') ||
        senior.patronymic.endsWith('Оглы'))
    )
      return 'male';

    if (
      senior.patronymic &&
      (senior.patronymic.endsWith('на') ||
        senior.patronymic.endsWith('кызы') ||
        senior.patronymic.endsWith('Кызы'))
    )
      return 'female';
    if (
      senior.lastName &&
      (senior.lastName.endsWith('ов') ||
        senior.lastName.endsWith('ев') ||
        senior.lastName.endsWith('ин'))
    )
      return 'male';
    if (
      senior.lastName &&
      (senior.lastName.endsWith('ова') ||
        senior.lastName.endsWith('ева') ||
        senior.lastName.endsWith('ина'))
    )
      return 'female';
    return null;
  }

  fullName(senior: SeniorRow) {
    const ln = senior['lastName'] ?? '';
    const fn = senior['firstName'] ?? '';
    const pn = senior['patronymic'] ?? '';
    return [ln, fn, pn].filter(Boolean).join(' ').trim();
  }

  async validate(senior: SeniorRow): Promise<boolean> {
    const fullName = this.fullName(senior);
    const resultBirthday = await this.validateDateOfBirthday(
      fullName,
      senior.dayBirthday ?? null,
      senior.monthBirthday ?? null,
      senior.yearBirthday ?? null,
    );

    if (resultBirthday === false) return false;

    if (resultBirthday !== true) {
      if ('day' in resultBirthday) senior.dayBirthday = resultBirthday.day;
      if ('month' in resultBirthday)
        senior.monthBirthday = resultBirthday.month;
      if ('year' in resultBirthday) senior.yearBirthday = resultBirthday.year;
    }
    senior.birthDate =
      senior.yearBirthday && senior.monthBirthday && senior.dayBirthday
        ? senior.yearBirthday +
          '-' +
          (senior.monthBirthday < 10 ? '0' : '') +
          senior.monthBirthday +
          '-' +
          (senior.dayBirthday < 10 ? '0' : '') +
          senior.dayBirthday
        : null;
    const resultGender = await this.validateGender(fullName, senior);

    if (resultGender === false) return false;
    if (resultGender !== true) {
      const normalizeFirstName = this.normalizeName(resultGender.firstName);
      if (normalizeFirstName) senior.firstName = normalizeFirstName;
      senior.lastName = this.normalizeName(resultGender.lastName ?? null);
      senior.patronymic = this.normalizeName(resultGender.patronymic ?? null);
      senior.gender = resultGender.gender;
    }

    return true;
  }

  private async validateDateOfBirthday(
    fullName: string,
    day: number | null,
    month: number | null,
    year: number | null,
  ): Promise<
    | true
    | false
    | { day?: number | null; month?: number | null; year?: number | null }
  > {
    const params = {
      fullName,
      day: day ?? '??',
      month: month ?? '??',
      year: year ?? '????',
    };
    let error = null;
    let type: ErrorType | null = null;
    // всё пусто — допустимо
    if (day == null && month == null && year == null) {
      return true;
    }

    // месяц обязателен если есть день
    if (day != null && month == null) {
      error = this.translateService.instant(
        'SENIOR.DIALOG.CHECK_DATE.ERROR.NO_MONTH',
        params,
      );
      type = 'NO_MONTH';
    }
    //  день обязателен если есть месяц
    if (!error && month != null && day == null) {
      error = this.translateService.instant(
        'SENIOR.DIALOG.CHECK_DATE.ERROR.NO_DAY',
        params,
      );
      type = 'NO_DAY';
    }

    // диапазон месяца
    if (!error && month != null && (month < 1 || month > 12)) {
      error = this.translateService.instant(
        'SENIOR.DIALOG.CHECK_DATE.ERROR.WRONG_MONTH',
        params,
      );
      type = 'WRONG_MONTH';
    }

    // диапазон года
    if (!error && year != null && year != 1800) {
      const currentYear = new Date().getFullYear();

      if (year < 1905 || year > currentYear) {
        error = this.translateService.instant(
          'SENIOR.DIALOG.CHECK_DATE.ERROR.WRONG_YEAR',
          params,
        );
        type = 'WRONG_YEAR';
      } else if (year < 1917 || year > currentYear - 18) {
        error = this.translateService.instant(
          'SENIOR.DIALOG.CHECK_DATE.ERROR.STRANGE_YEAR',
          params,
        );
        type = 'STRANGE_YEAR';
      }
    }

    // диапазон дня
    if (!error && day != null) {
      if (day < 1 || day > 31) {
        error = this.translateService.instant(
          'SENIOR.DIALOG.CHECK_DATE.ERROR.WRONG_DAY',
          params,
        );
        type = 'WRONG_DAY';
      }

      // если есть месяц — проверяем реальное количество дней
      if (month != null) {
        const testYear = year ?? 2000; // високосный безопасный год
        const daysInMonth = new Date(testYear, month, 0).getDate();
        if (day > daysInMonth) {
          error = this.translateService.instant(
            'SENIOR.DIALOG.CHECK_DATE.ERROR.WRONG_DAY',
            params,
          );
          type = 'WRONG_DAY';
        }
      }
    }

    if (!error || !type) return true;
    return firstValueFrom(this.openDialogToCorrectDate(error, type));
  }

  private async validateGender(
    fullName: string,
    senior: SeniorRow,
  ): Promise<
    | true
    | false
    | {
        firstName: string;
        patronymic: string | null;
        lastName: string | null;
        gender: 'male' | 'female';
      }
  > {
    if (senior.gender !== null) return true;
    const error = this.translateService.instant(
      'SENIOR.DIALOG.CHECK_GENDER.ERROR.NO_GENDER',
      {
        fullName,
        day: senior.dayBirthday,
        month: senior.monthBirthday,
        year: senior.yearBirthday,
      },
    );
    return firstValueFrom(this.openDialogToCorrectGender(error, senior));
  }

  private openDialogToCorrectDate(
    e: string,
    type: ErrorType,
  ): Observable<
    | boolean
    | { day?: number | null; month?: number | null; year?: number | null }
  > {
    const dialogRef = this.dialog.open(CheckDateDialogComponent, {
      disableClose: true,
      minWidth: '800px',
      height: '40%',
      autoFocus: 'dialog',
      restoreFocus: true,

      data: { error: e, type },
    });

    return dialogRef.afterClosed().pipe(
      map(
        (
          result:
            | {
                action: 'custom' | 'retain' | 'default' | 'empty';
                value: { day?: number; month?: number; year?: number } | null;
                birthDate: Date;
              }
            | false,
        ) => {
          console.log('result', result);
          if (result === false) return false;

          if (result.action === 'custom') {
            const day = result.birthDate.getDate();
            const month = result.birthDate.getMonth() + 1; // месяцы с 0
            const year = result.birthDate.getFullYear();
            return { day, month, year };
          }
          if (result.action === 'retain') return true;
          if (result.action === 'default') {
            if (result.value?.day) return { day: result.value.day };
            if (result.value?.month) return { month: result.value.month };
            if (result.value?.year) return { year: result.value.year };
          }
          if (result.action === 'empty')
            return { day: null, month: null, year: null };
          return true;
        },
      ),
    );
  }

  private openDialogToCorrectGender(
    e: string,
    s: SeniorRow,
  ): Observable<
    | false
    | {
        firstName: string;
        patronymic: string | null;
        lastName: string | null;
        gender: 'male' | 'female';
      }
  > {
    const dialogRef = this.dialog.open(CheckGenderDialogComponent, {
      disableClose: true,
      minWidth: '800px',
      height: '40%',
      autoFocus: 'dialog',
      restoreFocus: true,

      data: { error: e, senior: s },
    });

    return dialogRef.afterClosed().pipe(
      map((result) => {
        console.log('result', result);
        return result;
      }),
    );
  }

  private deleteDuplicates(list: SeniorRow[]): {
    cleaned: SeniorRow[];
    duplicatesMessage: string | null;
  } {
    const seen = new Map<string, SeniorRow>();
    const duplicates: SeniorRow[] = [];

    for (const senior of list) {
      const key = [
        senior.lastName ?? '',
        senior.firstName ?? '',
        senior.patronymic ?? '',
        senior.dayBirthday ?? '',
        senior.monthBirthday ?? '',
        senior.yearBirthday ?? '',
        senior.gender ?? '',
      ]
        .join('|')
        .toLowerCase()
        .trim();

      if (seen.has(key)) {
        duplicates.push(senior);
        continue;
      }

      seen.set(key, senior);
    }

    const cleaned = [...seen.values()];

    if (!duplicates.length) {
      return {
        cleaned,
        duplicatesMessage: null,
      };
    }

    const duplicatesMessage = duplicates
      .map((s) => {
        const fullName = this.fullName(s);
        const birthDate = [s.dayBirthday, s.monthBirthday, s.yearBirthday]
          .filter(Boolean)
          .join('.');

        return `${fullName}${birthDate ? ` (${birthDate})` : ''}`;
      })
      .join('\n');

    return {
      cleaned,
      duplicatesMessage,
    };
  }

  private async compareLists(
    list: SeniorRow[],
    homeName: string,
  ): Promise<Differences> {
    try {
      this.showSpinner.set(true);
      const res = await firstValueFrom(
        this.seniorService
          .compareLists(
            list,
            homeName,
            this.commentsMode.value,
            this.chosenMonths.value,
          )
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );
      console.log('res', res.data);
      this.showSpinner.set(false);
      return res.data;
    } catch (err) {
      this.msgWrapper.handle(err, {
        source: 'SeniorsBulkUpdateComponent',
        stage: 'compareLists',
        homeName,
      });
      this.showSpinner.set(false);
      throw err;
    }
  }

  getRowHeight(type: 'main' | 'returned' | 'duplicates' | 'updated') {
    let lengthOfTable = 0;
    if (type === 'main') {
      const maxLengthOfTable = Math.max(
        this.removedSeniors.length + 1,
        this.newSeniors.length + 1,
      );
      lengthOfTable = Math.min(maxLengthOfTable, 10);
    } else {
      const totalChanges = this.returnedSeniors.reduce(
        (sum, item) => sum + item.changeRows.length,
        0,
      );
      lengthOfTable = this.returnedSeniors.length + 10 + totalChanges;
    }
    //console.log('lengthOfTable', lengthOfTable);
    return lengthOfTable;
  }

  isFormInvalid() {
    return (
      this.dateOfUpdate.hasError('required') ||
      this.updatedSeniors.length > 0 ||
      this.possibleDuplicates.length > 0 ||
      this.returnedSeniors.length > 0 ||
      !this.currentHomeName ||
      this.showStart
    );
  }

  onSelectRemovedRow(event: TableRowSelectEvent) {
    this.selectedRemovedSeniorIndex = event.index ?? null;
  }
  onSelectNewRow(event: TableRowSelectEvent) {
    this.selectedNewSeniorIndex = event.index ?? null;
  }

  onUnselectRemovedRow(_event: TableRowSelectEvent) {
    this.selectedRemovedSeniorIndex = null;
  }
  onUnselectNewRow(_event: TableRowSelectEvent) {
    this.selectedNewSeniorIndex = null;
  }

  moveToUpdated() {
    console.log('this.selectedNewSeniorIndex', this.selectedNewSeniorIndex);
    console.log(
      'this.selectedRemovedSeniorIndex',
      this.selectedRemovedSeniorIndex,
    );
    console.log('this.selectedNewSenior', this.selectedNewSenior);
    console.log('this.selectedRemovedSenior', this.selectedRemovedSenior);
    if (
      this.selectedNewSenior &&
      this.selectedRemovedSenior &&
      this.selectedNewSeniorIndex !== null &&
      this.selectedRemovedSeniorIndex !== null
    ) {
      console.log('this.updatedSeniors', this.updatedSeniors);
      const changes = this.compareData(
        this.selectedNewSenior,
        this.selectedRemovedSenior,
      );
      this.updatedSeniors.push({
        newSenior: this.selectedNewSenior,
        oldSenior: this.selectedRemovedSenior,
        changes,
        changeRows: this.getChangeRows(changes),
      });
      this.newSeniors.splice(this.selectedNewSeniorIndex, 1);
      this.removedSeniors.splice(this.selectedRemovedSeniorIndex, 1);

      console.log('this.newSeniors', this.newSeniors);
      console.log('this.updatedSeniors', this.updatedSeniors);
      console.log('this.removedSeniors', this.removedSeniors);

      this.selectedNewSenior = null;
      this.selectedRemovedSenior = null;
      this.selectedNewSeniorIndex = null;
      this.selectedRemovedSeniorIndex = null;
    }
  }

  moveFromReturned(rowIndex: number) {
    this.newSeniors.push(this.returnedSeniors[rowIndex].newSenior);
    this.returnedSeniors.splice(rowIndex, 1);
  }

  moveFromPossibleDuplicates(rowIndex: number) {
    this.newSeniors.push(this.possibleDuplicates[rowIndex].newSenior);
    this.removedSeniors.push(this.possibleDuplicates[rowIndex].oldSenior);
    this.possibleDuplicates.splice(rowIndex, 1);
  }
  moveFromUpdated(rowIndex: number) {
    this.newSeniors.push(this.updatedSeniors[rowIndex].newSenior);
    this.removedSeniors.push(this.updatedSeniors[rowIndex].oldSenior);
    this.updatedSeniors.splice(rowIndex, 1);
  }

  /*   onChange(seniorId: number, field: string, value: unknown): void {
    if (!this.accepted[seniorId]) {
      this.accepted[seniorId] = {};
    }
    this.accepted[seniorId][field] = value;
  } */

  acceptChanges(
    source: 'returned' | 'duplicates' | 'updated',
    seniorId: number,
    rowIndex: number,
    accepted: Record<string, unknown>,
  ): void {
    this.updated.push({
      seniorId,
      changes: accepted,
    });

    const sourceMap = {
      returned: this.returnedSeniors,
      duplicates: this.possibleDuplicates,
      updated: this.updatedSeniors,
    };

    sourceMap[source].splice(rowIndex, 1);

    console.log('this.possibleDuplicates', this.possibleDuplicates);
    console.log('this.updated', this.updated);
  }

  private compareData(newData: SeniorRaw, oldData: SeniorRaw) {
    const changes: SeniorChanges = {};

    const mainFields = [
      'lastName',
      //'firstName',
      'patronymic',
      //'gender',
      //'birthDate',
      //'dateOfExit',
    ] as const satisfies readonly (keyof SeniorChanges)[];

    for (const field of mainFields) {
      const newValue = newData[field] ?? null;
      const oldValue = oldData[field] ?? null;

      if (newValue !== oldValue) {
        changes[field] = { newValue, oldValue };
      }
    }

    if (newData.firstName !== oldData.firstName)
      changes.firstName = {
        newValue: newData.firstName,
        oldValue: oldData.firstName,
      };

    if (newData.gender !== oldData.gender)
      changes.gender = {
        newValue: newData.gender,
        oldValue: oldData.gender,
      };

    if (!this.isSameDateOnly(newData.birthDate, oldData.birthDate))
      changes.birthDate = {
        newValue: newData.birthDate,
        oldValue: oldData.birthDate,
      };

    if (!this.isSameDateOnly(newData.dateOfExit, oldData.dateOfExit))
      changes.dateOfExit = {
        newValue: newData.dateOfExit,
        oldValue: oldData.dateOfExit,
      };

    const otherFields = [
      //'dateOfConsent',
      'comment',
      'infoNote',
      'photoLink',
      'kindergarten',
      'teacher',
      'veteran',
      'childOfWar',
      'profession',
      'honoraryStatus',
      'interests',
      'orthodoxBeliever',
    ] as const satisfies readonly (keyof SeniorChanges)[];

    for (const field of otherFields) {
      const newValue = newData[field] ?? null;
      const oldValue = oldData[field] ?? null;
      if (this.commentsMode.value && newData.dateOfConsent === null) continue;
      if (newValue !== oldValue) {
        changes[field] = { newValue, oldValue };
      }
    }

    if (!this.isSameDateOnly(newData.dateOfConsent, oldData.dateOfConsent))
      if (
        !this.commentsMode.value ||
        (this.commentsMode.value && newData.dateOfConsent !== null)
      ) {
        changes.dateOfConsent = {
          newValue: newData.dateOfConsent,
          oldValue: oldData.dateOfConsent,
        };
      }

    return changes;
  }

  private isSameDateOnly(
    a: string | Date | null | undefined,
    b: string | Date | null | undefined,
  ): boolean {
    return this.toDateOnlyString(a) === this.toDateOnlyString(b);
  }

  private toDateOnlyString(
    value: string | Date | null | undefined,
  ): string | null {
    if (value == null || value === '') return null;

    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');

      return `${y}-${m}-${d}`;
    }

    return String(value).slice(0, 10);
  }

  private getChangeRows(changes: SeniorChanges): {
    field: keyof SeniorChanges;
    label: string;
    newValue: unknown;
    oldValue: unknown;
  }[] {
    return Object.entries(changes).map(([field, change]) => ({
      field: field as keyof SeniorChanges,
      label: field,
      newValue: change?.newValue ?? '',
      oldValue: change?.oldValue ?? '',
    }));
  }

  applyChanges() {
    this.showSpinner.set(true);
    console.log('applyChanges');
    this.admitted = [...this.newSeniors];
    this.removed = [...this.removedSeniors];
    const dateOfUpdate = this.dateOfUpdate.getRawValue();
    if (!dateOfUpdate) return;
    this.seniorService
      .updateList(
        this.admitted,
        this.removed,
        this.updated,
        this.currentHomeId,
        dateOfUpdate
      )
      .pipe(
        finalize(() => this.showSpinner.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.clear();
          this.index++;
          this.processHome();
          //process next home
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'SeniorsBulkUpdateComponent',
            stage: 'makeChanges',
            homeId: this.currentHomeId,
          }),
      });
  }

  clear() {
    this.currentHomeName = '';
    this.noChanges = false;
    this.showStart = false;
    this.chosenMonths.enable();

    this.newSeniors = [];
    this.removedSeniors = [];
    this.updatedSeniors = [];
    this.possibleDuplicates = [];
    this.returnedSeniors = [];

    this.selectedRemovedSenior = null;
    this.selectedNewSenior = null;
    this.selectedRemovedSeniorIndex = null;
    this.selectedNewSeniorIndex = null;

    this.admitted = [];
    this.removed = [];
    this.updated = [];

    this.chosenMonths.setValue([]);
    this.dateOfUpdate.setValue(null);
  }

  /*   expandAll() {
    this.expandedRows = this.removedSeniors.reduce(
      (acc, p) => (acc[p.id] = true) && acc,
      {},
    );
  }

  collapseAll() {
    this.expandedRows = {};
  } */
}

//TODO: запрос на сохранение измененных ФИО
