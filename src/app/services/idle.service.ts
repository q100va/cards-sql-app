// idle.service.ts
import { Injectable, NgZone, inject } from '@angular/core';
import { fromEvent, merge, timer, Subject, Subscription, BehaviorSubject, interval, firstValueFrom  } from 'rxjs';
import { startWith, switchMap, takeUntil } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { SignInService } from '../services/sign-in.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private zone = inject(NgZone);
  private auth = inject(SignInService);
  private confirm = inject(ConfirmationService);
  private i18n = inject(TranslateService);

  private stop$ = new Subject<void>();
  private sub?: Subscription;

  // публичный счётчик для шаблона
  private _countdown$ = new BehaviorSubject<number>(0);
  readonly countdown$ = this._countdown$.asObservable();

  // текущее «ожидание решения» из диалога
  private resolver?: (v: boolean) => void;
  private dialogOpen = false;

  start(idleMs = 20 * 60_000, confirmMs = 60_000) {
    this.stop();                     // стопим прошлое
    this.stop$ = new Subject<void>(); // ✅ создаём новый stop$ на каждый старт

  this.zone.runOutsideAngular(() => {
    const activity$ = merge(
      fromEvent<MouseEvent>(document, 'mousemove'),
      fromEvent<KeyboardEvent>(document, 'keydown'),
      fromEvent<Event>(document, 'click'),
      fromEvent<Event>(document, 'scroll'),
      fromEvent<Event>(document, 'visibilitychange'),
      fromEvent<FocusEvent>(window, 'focus'),
      fromEvent<TouchEvent>(window, 'touchstart'),
      fromEvent<TouchEvent>(window, 'touchmove'),
    );

      this.sub = activity$
        .pipe(
          startWith(null),
          switchMap(() => timer(idleMs)),
          takeUntil(this.stop$),
        )
        .subscribe(() => this.zone.run(() => this.onIdle(confirmMs)));
    });
  }

  stop() {
    this.stop$.next();
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

private async onIdle(confirmMs: number) {
  const ok = await this.askStaySignedIn(confirmMs);

  if (ok) {
    // обновим access по refresh-cookie
    try {
      await firstValueFrom(this.auth.hydrateFromSession());
    } catch {
      // игнорим: даже если refresh упал, дальше сработает интерсептор/логаут
    } finally {
      this.start(); // всегда перезапускаем цикл ожидания активности
    }
  } else {
    this.auth.logout().subscribe(); // явный выход
  }
}

  /** Показываем диалог с собственным футером, считаем сек, ждём ответа/таймаута */
  private askStaySignedIn(timeoutMs: number): Promise<boolean> {
    if (this.dialogOpen) {
      // на всякий случай — не открывать второй раз
      return Promise.resolve(true);
    }
    this.dialogOpen = true;

    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        this.resolver = undefined;
        this.dialogOpen = false;
        this._countdown$.next(0);
        try { this.confirm.close(); } catch {}
        resolve(v);
      };

      // запоминаем резолвер, чтобы кнопки из шаблона могли завершить промис
      this.resolver = finish;

      // обратный отсчёт
      const totalSec = Math.max(1, Math.round(timeoutMs / 1000));
      this._countdown$.next(totalSec);
      const tick$ = interval(1000).pipe(takeUntil(this.stop$)).subscribe(() => {
        const next = (this._countdown$.value || totalSec) - 1;
        this._countdown$.next(next);
        if (next <= 0) {
          tick$.unsubscribe();
          finish(false); // авто-выход по таймауту
        }
      });

      // показываем диалог (кнопки — в кастомном footer)
      this.confirm.confirm({
        key: 'idleConfirm',
        closable: false,
        closeOnEscape: false,
        accept: () => finish(true),  // если вдруг кликнут «встроенные» кнопки
        reject: () => finish(false),
      });
    });
  }

  /** Вызываем из шаблона (кнопка “Stay”) */
  confirmAccept() {
    this.resolver?.(true);
  }
  /** Вызываем из шаблона (кнопка “Logout”) */
  confirmReject() {
    this.resolver?.(false);
  }
}
