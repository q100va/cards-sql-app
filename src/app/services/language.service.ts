import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, Subscription, take } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';
import { PrimeNG } from 'primeng/config';
import type { Translation } from 'primeng/api';
import {
  DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, isLang, readPersistedLanguage, type Lang,
} from '../utils/language-preference';

export type { Lang } from '../utils/language-preference';

export const enPrime: Translation = {
  accept: 'Yes',
  reject: 'No',
  choose: 'Choose',
  upload: 'Upload',
  cancel: 'Cancel',
  dayNames: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  monthNames: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  today: 'Today',
  clear: 'Clear',
  startsWith: 'Starts with',
  contains: 'Contains',
  notContains: 'Does not contain',
  endsWith: 'Ends with',
  equals: 'Equals',
  notEquals: 'Does not equal',
  noFilter: 'No filter',
  lt: 'Less than',
  lte: 'Less than or equal to',
  gt: 'Greater than',
  gte: 'Greater than or equal to',
  dateIs: 'Date is',
  dateIsNot: 'Date is not',
  dateBefore: 'Date is before',
  dateAfter: 'Date is after',
  apply: 'Apply',
  matchAll: 'Match all',
  matchAny: 'Match any',
  addRule: 'Add rule',
  removeRule: 'Remove rule',
  weekHeader: 'Wk',
  firstDayOfWeek: 0,
  aria: {
    trueLabel: 'True',
    falseLabel: 'False',
    nullLabel: 'Not selected',
    star: '1 star',
    stars: '{star} stars',
    selectAll: 'Select all',
    unselectAll: 'Unselect all',
    close: 'Close',
    firstPageLabel: 'First page',
    lastPageLabel: 'Last page',
    nextPageLabel: 'Next page',
    previousPageLabel: 'Previous page',
    pageLabel: 'Page {page}',
    rowsPerPageLabel: 'Rows per page',
  },
};

export const ruPrime: Translation = {
  accept: 'Да',
  reject: 'Нет',
  choose: 'Выбрать',
  upload: 'Загрузить',
  cancel: 'Отмена',
  dayNames: [
    'воскресенье',
    'понедельник',
    'вторник',
    'среда',
    'четверг',
    'пятница',
    'суббота',
  ],
  dayNamesShort: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  monthNames: [
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь',
  ],
  monthNamesShort: [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ],
  today: 'Сегодня',
  weekHeader: 'Нед',
  firstDayOfWeek: 1,
  aria: {
    trueLabel: 'Истина',
    falseLabel: 'Ложь',
    nullLabel: 'Не выбрано',
    star: '1 звезда',
    stars: '{star} звёзд',
    selectAll: 'Выбрать всё',
    unselectAll: 'Снять выбор',
    close: 'Закрыть',
    firstPageLabel: 'Первая страница',
    lastPageLabel: 'Последняя страница',
    nextPageLabel: 'Следующая страница',
    previousPageLabel: 'Предыдущая страница',
    pageLabel: 'Страница {page}',
    rowsPerPageLabel: 'Строк на странице',
  },
  startsWith: 'Начинается с',
  contains: 'Содержит',
  notContains: 'Не содержит',
  endsWith: 'Заканчивается на',
  equals: 'Равно',
  notEquals: 'Не равно',
  noFilter: 'Без фильтра',

  lt: 'Меньше',
  lte: 'Меньше или равно',
  gt: 'Больше',
  gte: 'Больше или равно',

  dateIs: 'Дата равна',
  dateIsNot: 'Дата не равна',
  dateBefore: 'До',
  dateAfter: 'После',

  clear: 'Очистить',
  apply: 'Применить',

  matchAll: 'Совпадают все',
  matchAny: 'Совпадает любой',

  addRule: 'Добавить условие',
  removeRule: 'Удалить условие',
};

@Injectable({ providedIn: 'root' })
export class LanguageService implements OnDestroy {
  private readonly translateService = inject(TranslateService);
  private readonly dateAdapter = inject<DateAdapter<unknown>>(DateAdapter);
  private readonly primeng = inject(PrimeNG);
  private readonly initialLanguage = readPersistedLanguage() ?? DEFAULT_LANGUAGE;
  private readonly languageState = new BehaviorSubject<Lang>(this.initialLanguage);
  readonly lang$ = this.languageState.asObservable();
  private readonly ready = new ReplaySubject<void>(1);
  private initializationStarted = false;
  private committed = false;
  private revision = 0;
  private pendingLanguage?: Lang;
  private pending?: Subscription;

  constructor() {
    this.initialize();
  }

  initialize(): Observable<void> {
    if (!this.initializationStarted) {
      this.initializationStarted = true;
      this.translateService.addLangs(['en', 'ru']);
      this.translateService.setFallbackLang(DEFAULT_LANGUAGE);
      this.apply(this.initialLanguage);
    }
    return this.ready.asObservable();
  }

  get current(): Lang { return this.languageState.value; }
  get locale(): string { return this.current; }

  set(lang: Lang): void {
    if (!isLang(lang) || (this.committed && lang === this.current && !this.pendingLanguage)) return;
    this.apply(lang);
  }

  ngOnDestroy(): void {
    this.revision++;
    this.pending?.unsubscribe();
    this.ready.complete();
    this.languageState.complete();
  }

  private apply(lang: Lang): void {
    const revision = ++this.revision;
    this.pending?.unsubscribe();
    this.pendingLanguage = lang;
    this.pending = this.translateService.use(lang).pipe(take(1)).subscribe({
      next: () => {
        if (revision !== this.revision) return;
        this.pendingLanguage = undefined;
        this.commit(lang);
      },
      error: (error: unknown) => {
        if (revision !== this.revision) return;
        this.pendingLanguage = undefined;
        if (this.committed) {
          this.translateService.use(this.current);
        } else if (lang !== DEFAULT_LANGUAGE) {
          this.apply(DEFAULT_LANGUAGE);
        } else {
          this.ready.error(error);
        }
      },
    });
  }

  private commit(lang: Lang): void {
    // Commit persisted/runtime state only after translation activation succeeds.
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    this.dateAdapter.setLocale(lang);
    const translation = lang === 'ru' ? ruPrime : enPrime;
    this.primeng.setTranslation({
      ...translation,
      aria: { ...this.primeng.translation.aria, ...translation.aria },
    });
    this.languageState.next(lang);
    if (!this.committed) {
      this.committed = true;
      this.ready.next();
      this.ready.complete();
    }
  }
}
