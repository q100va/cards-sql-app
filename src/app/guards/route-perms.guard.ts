import { inject } from '@angular/core';
import { Router, type CanMatchFn, type UrlTree } from '@angular/router';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, type OperationCode } from '../services/auth.service';

function permissionGuard(allows: (auth: AuthService) => boolean): CanMatchFn {
  return (): Observable<boolean | UrlTree> => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.permsReadyOnce$.pipe(
      map(() => allows(auth) ? true : router.parseUrl('/forbidden')),
    );
  };
}

export const requireOp = (op: OperationCode): CanMatchFn =>
  permissionGuard((auth) => auth.has(op));

export const requireAnyOp = (...ops: OperationCode[]): CanMatchFn =>
  permissionGuard((auth) => ops.some((op) => auth.has(op)));

export const requireAllOps = (...ops: OperationCode[]): CanMatchFn =>
  permissionGuard((auth) => ops.every((op) => auth.has(op)));
