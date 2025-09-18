// auth-ready.guard.ts

import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const waitAuthReady: CanMatchFn = () => inject(AuthService).authReadyOnce$;

