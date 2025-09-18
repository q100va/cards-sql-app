import {
  ApplicationConfig,
  provideZoneChangeDetection,
  ErrorHandler,
  importProvidersFrom,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import localeEn from '@angular/common/locales/en';
registerLocaleData(localeRu);
registerLocaleData(localeEn);

import Material from '@primeng/themes/aura';
import { GlobalErrorHandler } from './services/global-error-handler';
import { httpErrorInterceptor } from './interceptors/http-error.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// ⬇️ ngx-translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { PublicTranslateLoader } from './utils/public-translate-loader';
import { langHeaderInterceptor } from './interceptors/lang-header.interceptor';
import { ruPrime } from './services/language.service';
import { AuthService } from './services/auth.service';
import { catchError, firstValueFrom, of } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    provideHttpClient(
      withInterceptors([httpErrorInterceptor, langHeaderInterceptor]),
      withInterceptorsFromDi()
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return firstValueFrom(
        auth.hydrateFromSession().pipe(catchError(() => of(void 0)))
      );
    }),

    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: Material }, translation: ruPrime }),
    provideMomentDateAdapter(),
    { provide: LOCALE_ID, useValue: 'ru-RU' },

    MessageService,
    ConfirmationService,

    importProvidersFrom(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useFactory: (http: HttpClient) => new PublicTranslateLoader(http), deps: [HttpClient] },
        fallbackLang: 'ru',
      })
    ),
  ],
};

