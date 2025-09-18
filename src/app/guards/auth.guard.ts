// src/app/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const allowed = await firstValueFrom(
    auth.currentUser$.pipe(
      take(1),
      map(u => !!u)
    )
  );
  //console.log("allowed", allowed);

  return allowed ? true : router.parseUrl('/session/sign-in');
};
