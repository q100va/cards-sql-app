import { HttpInterceptorFn } from '@angular/common/http';
import { requestLanguage } from '../utils/language-preference';

export const langHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/i18n/') || req.headers.has('x-lang')) return next(req);
  return next(req.clone({ setHeaders: { 'x-lang': requestLanguage() } }));
};
