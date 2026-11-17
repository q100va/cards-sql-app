import { TestBed, discardPeriodicTasks, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { BehaviorSubject, Subject, Subscription, defer, of } from 'rxjs';
import { AppComponent } from '../app.component';
import { AuthService } from './auth.service';
import { IdleService } from './idle.service';
import type { AuthUser } from '../../../shared/schemas/auth.schema';

const IDLE_USER: AuthUser = {
  id: 11, userName: 'idle-user', firstName: 'Idle', lastName: 'User', roleId: 1, roleName: 'TEST_ROLE',
};
const DEFAULT_IDLE_MS = 20 * 60_000;

class IdleSession implements Pick<AuthService,
  'currentUser$' | 'getCurrentUserSnapshot' | 'getAuthGeneration' | 'getToken' | 'hydrateFromSession' | 'logout'> {
  private readonly user = new BehaviorSubject<AuthUser | null>(IDLE_USER);
  private generation = 0;
  readonly currentUser$ = this.user.asObservable();
  readonly restoration = new Subject<void>();
  readonly hydrateFromSession = jasmine.createSpy<AuthService['hydrateFromSession']>('hydrateFromSession')
    .and.callFake(() => this.restoration.asObservable());
  readonly logout = jasmine.createSpy<AuthService['logout']>('logout').and.callFake(() => defer(() => {
    this.becomeAnonymous();
    return of(void 0);
  }));

  getCurrentUserSnapshot(): AuthUser | null { return this.user.value; }
  getAuthGeneration(): number { return this.generation; }
  getToken(): string { return this.user.value ? 'idle-access-token' : ''; }

  becomeAnonymous(): void {
    this.generation++;
    this.user.next(null);
  }
}

describe('IdleService session lifecycle', () => {
  let session: IdleSession;
  let confirmation: jasmine.SpyObj<ConfirmationService>;
  let idle: IdleService;
  let root: AppComponent | undefined;
  let countdown: number;
  let countdownSubscription: Subscription;

  beforeEach(() => {
    session = new IdleSession();
    confirmation = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm', 'close']);
    root = undefined;
    TestBed.configureTestingModule({
      providers: [
        IdleService, provideTranslateService(),
        { provide: AuthService, useValue: session },
        { provide: ConfirmationService, useValue: confirmation },
      ],
    });
  });

  function createIdle(withApplication = false): void {
    // Construct NgZone inside fakeAsync so even outside-Angular monitoring uses the controlled clock.
    idle = TestBed.inject(IdleService);
    countdownSubscription = idle.countdown$.subscribe(value => { countdown = value; });
    if (withApplication) root = TestBed.runInInjectionContext(() => new AppComponent());
  }

  function cleanup(): void {
    root?.ngOnDestroy();
    idle.stop();
    idle.confirmReject();
    session.restoration.complete();
    flushMicrotasks();
    idle.stop();
    countdownSubscription.unsubscribe();
    discardPeriodicTasks();
  }

  it('cancels an open idle decision on stop and opens a fresh prompt after restart', fakeAsync(() => {
    createIdle();
    try {
      idle.start(1000, 5000);
      tick(1000);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
      expect(countdown).toBe(5);
      idle.stop();
      flushMicrotasks();
      expect(confirmation.close).toHaveBeenCalledTimes(1);
      expect(countdown).toBe(0);
      tick(5000);
      expect(countdown).toBe(0);
      expect(session.logout).not.toHaveBeenCalled();
      idle.start(1000, 5000);
      tick(1000);
      flushMicrotasks();
      expect(confirmation.confirm).toHaveBeenCalledTimes(2);
      expect(countdown).toBe(5);
      expect(session.hydrateFromSession).not.toHaveBeenCalled();
    } finally { cleanup(); }
  }));

  it('does not restart monitoring when restoration settles with an anonymous session', fakeAsync(() => {
    createIdle(true);
    try {
      tick(DEFAULT_IDLE_MS);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
      idle.confirmAccept();
      flushMicrotasks();
      expect(session.hydrateFromSession).toHaveBeenCalledTimes(1);
      const restart = spyOn(idle, 'start').and.callThrough();
      session.becomeAnonymous();
      // AuthService handles restoration failure by clearing public state and emitting void.
      session.restoration.next();
      session.restoration.complete();
      flushMicrotasks();
      expect(session.getCurrentUserSnapshot()).toBeNull();
      expect(restart).not.toHaveBeenCalled();
      tick(DEFAULT_IDLE_MS);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    } finally { cleanup(); }
  }));

  it('invalidates an open prompt and its stale callback when the application logs out', fakeAsync(() => {
    createIdle(true);
    try {
      tick(DEFAULT_IDLE_MS);
      const prompt = confirmation.confirm.calls.mostRecent().args[0];
      const generation = session.getAuthGeneration();
      const restart = spyOn(idle, 'start').and.callThrough();
      session.logout().subscribe();
      expect(session.getAuthGeneration()).toBeGreaterThan(generation);
      expect(confirmation.close).toHaveBeenCalledTimes(1);
      expect(countdown).toBe(0);
      prompt.accept?.();
      flushMicrotasks();
      expect(session.hydrateFromSession).not.toHaveBeenCalled();
      expect(restart).not.toHaveBeenCalled();
      tick(DEFAULT_IDLE_MS);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    } finally { cleanup(); }
  }));

  it('keeps one listener set, idle timer and countdown across repeated start/stop cycles', fakeAsync(() => {
    createIdle();
    const addDocument = spyOn(document, 'addEventListener').and.callThrough();
    const removeDocument = spyOn(document, 'removeEventListener').and.callThrough();
    const addWindow = spyOn(window, 'addEventListener').and.callThrough();
    const removeWindow = spyOn(window, 'removeEventListener').and.callThrough();
    try {
      idle.start(1000, 3000);
      idle.stop();
      idle.start(1000, 3000);
      idle.stop();
      idle.start(1000, 3000);
      for (const type of ['keydown', 'click', 'scroll']) {
        expect(addDocument.calls.allArgs().filter(([event]) => event === type).length
          - removeDocument.calls.allArgs().filter(([event]) => event === type).length).withContext(type).toBe(1);
      }
      for (const type of ['focus', 'wheel', 'touchstart', 'touchmove']) {
        expect(addWindow.calls.allArgs().filter(([event]) => event === type).length
          - removeWindow.calls.allArgs().filter(([event]) => event === type).length).withContext(type).toBe(1);
      }
      tick(500);
      document.dispatchEvent(new MouseEvent('click'));
      tick(500);
      expect(confirmation.confirm).not.toHaveBeenCalled();
      tick(500);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
      expect(countdown).toBe(3);
      tick(1000);
      expect(countdown).toBe(2);
      idle.stop();
      tick(5000);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    } finally { cleanup(); }
  }));

  it('expires the grace period on the first delayed callback after its deadline', fakeAsync(() => {
    createIdle();
    try {
      idle.start(1000, 5000);
      tick(1000);
      expect(countdown).toBe(5);
      // Advance both clock sources without delivering the intervening interval callbacks.
      const wallAfterDeadline = Date.now() + 10_000;
      const monotonicAfterDeadline = performance.now() + 10_000;
      spyOn(Date, 'now').and.returnValue(wallAfterDeadline);
      spyOn(performance, 'now').and.returnValue(monotonicAfterDeadline);
      tick(1000);
      flushMicrotasks();
      expect(countdown).toBe(0);
      expect(session.logout).toHaveBeenCalledTimes(1);
      expect(confirmation.close).toHaveBeenCalledTimes(1);
    } finally { cleanup(); }
  }));

  it('does not extend the idle deadline with a second reset for one visibility event', fakeAsync(() => {
    createIdle();
    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    try {
      idle.start(1000, 5000);
      tick(500);
      document.dispatchEvent(new Event('visibilitychange'));
      tick(1000);
      expect(confirmation.confirm).withContext('deadline follows the actual visibility event').toHaveBeenCalledTimes(1);
      tick(250);
      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    } finally { cleanup(); }
  }));

  it('logs out once after an ordinary idle grace period expires', fakeAsync(() => {
    createIdle(true);
    try {
      tick(DEFAULT_IDLE_MS);
      expect(countdown).toBe(60);
      tick(1000);
      expect(countdown).toBe(59);
      tick(59_000);
      flushMicrotasks();
      expect(countdown).toBe(0);
      expect(confirmation.close).toHaveBeenCalledTimes(1);
      expect(session.logout).toHaveBeenCalledTimes(1);
      expect(session.hydrateFromSession).not.toHaveBeenCalled();
      expect(session.getCurrentUserSnapshot()).toBeNull();
    } finally { cleanup(); }
  }));

  it('starts a fresh authenticated idle cycle after successful restoration', fakeAsync(() => {
    createIdle(true);
    try {
      tick(DEFAULT_IDLE_MS);
      idle.confirmAccept();
      flushMicrotasks();
      expect(session.hydrateFromSession).toHaveBeenCalledTimes(1);
      session.restoration.next();
      session.restoration.complete();
      flushMicrotasks();
      expect(session.getCurrentUserSnapshot()).toEqual(IDLE_USER);
      expect(session.logout).not.toHaveBeenCalled();
      tick(DEFAULT_IDLE_MS);
      expect(confirmation.confirm).toHaveBeenCalledTimes(2);
    } finally { cleanup(); }
  }));

  it('does not let an old restoration result replace a newer monitoring cycle', fakeAsync(() => {
    createIdle();
    try {
      idle.start(1000, 5000);
      tick(1000);
      idle.confirmAccept();
      flushMicrotasks();
      expect(session.hydrateFromSession).toHaveBeenCalledTimes(1);
      idle.stop();
      idle.start(2000, 4000);
      const restart = spyOn(idle, 'start').and.callThrough();
      session.restoration.next();
      session.restoration.complete();
      flushMicrotasks();
      expect(restart).not.toHaveBeenCalled();
      tick(2000);
      expect(confirmation.confirm).toHaveBeenCalledTimes(2);
      expect(countdown).toBe(4);
    } finally { cleanup(); }
  }));
});
