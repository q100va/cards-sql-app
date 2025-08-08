import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { SanitizeInterceptor } from './interceptors/sanitize.interceptor';

import {provideMomentDateAdapter} from '@angular/material-moment-adapter';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
registerLocaleData(localeRu);

import Material from '@primeng/themes/aura';
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),//, withHashLocation()
    provideHttpClient(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
          preset: Material
      }
  }),
  provideMomentDateAdapter(),
  { provide: LOCALE_ID, useValue: 'ru-Ru'},
  MessageService,
  ConfirmationService,
   {
      provide: HTTP_INTERCEPTORS,
      useClass: SanitizeInterceptor,
      multi: true
    },
  ],
};


