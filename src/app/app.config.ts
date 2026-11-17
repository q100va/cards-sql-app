import {
  ApplicationConfig, ErrorHandler, LOCALE_ID, importProvidersFrom, inject,
  provideAppInitializer, provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptors, withInterceptorsFromDi,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import Material from '@primeng/themes/aura';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import localeEn from '@angular/common/locales/en';
import 'moment/locale/ru';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './services/global-error-handler';
import { httpErrorInterceptor } from './interceptors/http-error.interceptor';
import { langHeaderInterceptor } from './interceptors/lang-header.interceptor';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { PublicTranslateLoader } from './utils/public-translate-loader';
import { LanguageService } from './services/language.service';
import { AuthService } from './services/auth.service';

registerLocaleData(localeRu);
registerLocaleData(localeEn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([httpErrorInterceptor, langHeaderInterceptor]),
      withInterceptorsFromDi(),
    ),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: MAT_DATE_LOCALE, useValue: 'ru' },
    { provide: LOCALE_ID, useValue: 'ru-RU' },
    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: Material } }),
    provideMomentDateAdapter(),
    MessageService,
    ConfirmationService,
    importProvidersFrom(TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new PublicTranslateLoader(http),
        deps: [HttpClient],
      },
    })),
    provideAppInitializer(async () => {
      const language = inject(LanguageService);
      const auth = inject(AuthService);
      await firstValueFrom(language.initialize());
      await firstValueFrom(auth.hydrateFromSession().pipe(catchError(() => of(void 0))));
    }),
  ],
};
