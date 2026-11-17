import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { provideTranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';

// Opt in only for component specs that need the application's root UI services.
export function provideComponentTesting(): (Provider | EnvironmentProviders)[] {
  return [
    ...provideTranslateService(),
    provideHttpClient(),
    ...provideHttpClientTesting(),
    provideRouter([]),
    ...provideNoopAnimations(),
    ...provideMomentDateAdapter(),
    MessageService,
    ConfirmationService,
  ];
}
