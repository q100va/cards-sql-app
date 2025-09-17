// src/app/guards/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SignInService } from '../services/sign-in.service';
import { firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(SignInService);

  const allowed = await firstValueFrom(
    auth.currentUser$.pipe(
      take(1),
      map(u => !!u)
    )
  );
  console.log("allowed", allowed);

  return allowed ? true : router.parseUrl('/session/sign-in');
};
