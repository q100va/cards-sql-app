import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, firstValueFrom, fromEvent, interval, merge, timer } from 'rxjs';
import { auditTime, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleService implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly authSubscription: Subscription;
  private readonly countdownState = new BehaviorSubject(0);
  readonly countdown$ = this.countdownState.asObservable();

  private cycle = 0;
  private stop$?: Subject<void>;
  private monitoring?: Subscription;
  private countdownTimer?: Subscription;
  private resolveDecision?: (decision: boolean | null) => void;

  constructor() {
    this.authSubscription = this.auth.currentUser$.subscribe(user => {
      if (!user) this.stop();
    });
  }

  start(idleMs = 20 * 60_000, confirmMs = 60_000): void {
    this.stop();
    if (!this.auth.getCurrentUserSnapshot()) return;
    const cycle = this.cycle;
    const stop$ = this.stop$ = new Subject<void>();

    this.zone.runOutsideAngular(() => {
      const passive: AddEventListenerOptions = { passive: true };
      const discrete$ = merge(
        fromEvent(document, 'keydown'), fromEvent(document, 'click'),
        fromEvent(document, 'visibilitychange'), fromEvent(window, 'focus'),
      );
      const bursty$ = merge(
        fromEvent(document, 'scroll', passive), fromEvent(window, 'wheel', passive),
        fromEvent(window, 'touchstart', passive), fromEvent(window, 'touchmove', passive),
      ).pipe(auditTime(250));

      this.monitoring = merge(discrete$, bursty$).pipe(
        startWith(null), switchMap(() => timer(idleMs)), takeUntil(stop$),
      ).subscribe(() => this.zone.run(() => this.onIdle(cycle, stop$, idleMs, confirmMs)));
    });
  }

  stop(): void {
    this.cycle++;
    const stop$ = this.stop$;
    this.stop$ = undefined;
    this.monitoring?.unsubscribe();
    this.monitoring = undefined;
    stop$?.next();
    stop$?.complete();
    this.resolveDecision?.(null);
  }

  ngOnDestroy(): void {
    this.stop();
    this.authSubscription.unsubscribe();
    this.countdownState.complete();
  }

  confirmAccept(): void { this.resolveDecision?.(true); }
  confirmReject(): void { this.resolveDecision?.(false); }

  private isCurrent(cycle: number): boolean {
    return cycle === this.cycle && !!this.stop$ && !!this.auth.getCurrentUserSnapshot();
  }

  private async onIdle(cycle: number, stop$: Subject<void>, idleMs: number, confirmMs: number): Promise<void> {
    if (!this.isCurrent(cycle)) return;
    this.monitoring?.unsubscribe();
    this.monitoring = undefined;
    const decision = await this.askStaySignedIn(confirmMs);
    // A stopped or superseded cycle cannot refresh, log out, or restart monitoring.
    if (decision === null || !this.isCurrent(cycle)) return;
    if (!decision) {
      this.stop();
      this.auth.logout().subscribe();
      return;
    }

    try {
      await firstValueFrom(this.auth.hydrateFromSession().pipe(takeUntil(stop$)));
    } catch {
      return;
    }
    if (this.isCurrent(cycle)) this.start(idleMs, confirmMs);
  }

  private askStaySignedIn(timeoutMs: number): Promise<boolean | null> {
    return new Promise(resolve => {
      let finished = false;
      const finish = (decision: boolean | null): void => {
        if (finished) return;
        finished = true;
        this.countdownTimer?.unsubscribe();
        this.countdownTimer = undefined;
        this.resolveDecision = undefined;
        this.countdownState.next(0);
        try {
          this.confirm.close();
        } finally {
          resolve(decision);
        }
      };
      this.resolveDecision = finish;
      // Derive remaining time from a deadline so delayed callbacks cannot extend the grace period.
      const deadline = Date.now() + timeoutMs;
      const updateCountdown = (): void => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        this.countdownState.next(remaining);
        if (!remaining) finish(false);
      };
      updateCountdown();
      if (finished) return;
      this.countdownTimer = interval(1000).subscribe(updateCountdown);
      this.confirm.confirm({
        key: 'idleConfirm', closable: false, closeOnEscape: false,
        accept: () => finish(true), reject: () => finish(false),
      });
    });
  }
}
