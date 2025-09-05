import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';
import { PRIME_NG_CONFIG, PrimeNGConfigType } from 'primeng/config';

export type Lang = 'en' | 'ru';
const LS_KEY = 'app.lang';

const LOCALE_MAP: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' };
type PrimeTranslation = Record<string, any>;

export const enPrime: PrimeTranslation = {
  accept: 'Yes',
  reject: 'No',
  choose: 'Choose',
  upload: 'Upload',
  cancel: 'Cancel',
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  dayNamesMin: ['Su','Mo','Tu','We','Th','Fr','Sa'],
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  today: 'Today',
  clear: 'Clear',
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
  },
};

export const ruPrime: PrimeTranslation = {
  accept: 'Да',
  reject: 'Нет',
  choose: 'Выбрать',
  upload: 'Загрузить',
  cancel: 'Отмена',
  dayNames: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
  dayNamesShort: ['вс','пн','вт','ср','чт','пт','сб'],
  dayNamesMin: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  monthNames: ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'],
  monthNamesShort: ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'],
  today: 'Сегодня',
  clear: 'Очистить',
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
  },
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _lang$ = new BehaviorSubject<Lang>('en');
  readonly lang$ = this._lang$.asObservable();

  private translateService = inject(TranslateService);
  private dateAdapter = inject<DateAdapter<any>>(DateAdapter as any);
  private primeng = inject<PrimeNGConfigType>(PRIME_NG_CONFIG);

  constructor() {
    this.translateService.addLangs(['en', 'ru']);
    const saved = (localStorage.getItem(LS_KEY) as Lang | null);
    const browser = (this.translateService.getBrowserLang?.() as Lang | undefined);
    const initial: Lang = saved ?? (browser === 'ru' ? 'ru' : 'en');
    this.apply(initial);
  }

  get current(): Lang { return this._lang$.value; }
  get locale(): string { return LOCALE_MAP[this.current]; }

  set(lang: Lang): void {
    if (lang === this.current) return;
    this.apply(lang);
  }

  private apply(lang: Lang): void {
    this.translateService.use(lang);
    localStorage.setItem(LS_KEY, lang);
    document.documentElement.setAttribute('lang', lang);

    this._lang$.next(lang);
    this.dateAdapter.setLocale(LOCALE_MAP[lang]);


    this.primeng.translation = { ...(lang === 'ru' ? ruPrime : enPrime) };
/*      const tr = lang === 'ru' ? ruPrime : enPrime;
    this.primeng.translation = { ...tr }; // <-- вот ключевая строка */
  }
}
