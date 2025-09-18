// route-perms.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

type OperationCode = string;

export const requireOp =
  (op: OperationCode): CanMatchFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.permsReadyOnce$.pipe(
      map(() => (auth.has(op) ? true : router.parseUrl('/forbidden')))
    );
  };

export const requireAnyOp =
  (...ops: OperationCode[]): CanMatchFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.permsReadyOnce$.pipe(
      map(() =>
        ops.some((op) => auth.has(op)) ? true : router.parseUrl('/forbidden')
      )
    );
  };

export const requireAllOps =
  (...ops: OperationCode[]): CanMatchFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.permsReadyOnce$.pipe(
      map(() =>
        ops.every((op) => auth.has(op)) ? true : router.parseUrl('/forbidden')
      )
    );
  };
