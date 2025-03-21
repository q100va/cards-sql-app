import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);

  const sessionUser = cookieService.get('session_user');

  if (sessionUser) {
    return true;
  } else {
    router.navigate(['/session/sign-in']);
    return false;
  }
};
