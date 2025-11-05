import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class DateUtilsService {
  constructor(private translateService: TranslateService) {}

  transformDate(date: Date | string): string {
    const locale =
      this.translateService.getCurrentLang() === 'en' ? 'en-US' : 'ru-RU';
    const format = locale === 'en-US' ? 'MM/dd/yyyy' : 'dd.MM.yyyy';
    return formatDate(date, format, locale);
  }
}
