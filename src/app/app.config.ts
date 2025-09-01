import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
//import { sanitizeInterceptor } from './interceptors/sanitize.interceptor';

import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
registerLocaleData(localeRu);

import Material from '@primeng/themes/aura';

import { GlobalErrorHandler } from './services/global-error-handler';
import { httpErrorInterceptor } from './interceptors/http-error.interceptor';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), //, withHashLocation()
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
     { provide: ErrorHandler, useClass: GlobalErrorHandler },
    //provideHttpClient( withInterceptors([sanitizeInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Material,
      },
    }),
    provideMomentDateAdapter(),
    { provide: LOCALE_ID, useValue: 'ru-Ru' },
    MessageService,
    ConfirmationService,
  ],
};
