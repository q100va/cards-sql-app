// src/app/interceptors/lang-header.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

const LS_KEY = 'app.lang';

export const langHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  // не трогаем загрузку переводов (и любые статические ассеты)
  if (req.url.includes('/i18n/')) {
    return next(req);
  }

  const lang =
    localStorage.getItem(LS_KEY) ||
    document.documentElement.lang ||
    'en';

  const cloned = req.clone({ setHeaders: { 'x-lang': lang } });
  return next(cloned);
};
