// utils/auth-harness.ts
import { BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

export type Perm = { operation: string; access: boolean; disabled: boolean };

export class AuthServiceHarness {
  // ---- session/user ----
  currentUser$ = new BehaviorSubject<any|null>(null);
  setUser(u: any|null) { this.currentUser$.next(u); }

  // ---- readiness ----
  authReady$  = new BehaviorSubject<boolean>(true);
  permsReady$ = new BehaviorSubject<boolean>(true);
  get authReadyOnce$()  { return this.authReady$.pipe(filter(Boolean), take(1)); }
  get permsReadyOnce$() { return this.permsReady$.pipe(filter(Boolean), take(1)); }
  setAuthReady(v: boolean)  { this.authReady$.next(v); }
  setPermsReady(v: boolean) { this.permsReady$.next(v); }
  getCurrentUserSnapshot(v: number) {return {roleId: v};}

  // ---- permissions ----
  private map = new Map<string, Perm>();
  permissions$ = () => this.map; // совместимо с твоей директивой
  has = (op: string) => !!this.map.get(op)?.access;

  setPerms(list: Perm[]) {
    this.map = new Map(list.map(p => [p.operation, p]));
  }
  grant(...ops: string[]) {
    ops.forEach(o => this.map.set(o, { operation: o, access: true, disabled: false }));
  }
  // Быстрый «всё можно»
  grantAllCommon() {
    this.grant(
      'ALL_OPS_ROLES',
      'VIEW_FULL_ROLES_LIST', 'VIEW_LIMITED_ROLES_LIST',
      'VIEW_FULL_USERS_LIST', 'VIEW_LIMITED_USERS_LIST',
      'VIEW_FULL_TOPONYMS_LIST', 'VIEW_LIMITED_TOPONYMS_LIST',
      'ADD_NEW_USER','EDIT_USER','DELETE_USER',
      'ADD_NEW_ROLE','EDIT_ROLE','DELETE_ROLE'
    );
  }
}
