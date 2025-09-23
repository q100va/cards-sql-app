// idle.service.ts
import { Injectable, NgZone, inject } from '@angular/core';
import {
  fromEvent,
  merge,
  timer,
  Subject,
  Subscription,
  BehaviorSubject,
  interval,
  firstValueFrom,
} from 'rxjs';
import { auditTime, filter, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleService {
  private zone = inject(NgZone);
  private auth = inject(AuthService);
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
    this.stop(); // остановка старого
    this.stop$ = new Subject<void>(); // новый стоп-триггер

    this.zone.runOutsideAngular(() => {
      const passive = { passive: true } as AddEventListenerOptions;

      // Редкие/дискретные события — можно без троттлинга
      const discrete$ = merge(
        fromEvent<KeyboardEvent>(document, 'keydown'),
        fromEvent<MouseEvent>(document, 'click'),
        fromEvent<Event>(document, 'visibilitychange'),
        fromEvent<FocusEvent>(window, 'focus')
      );

      // Шумные события — притормаживаем, чтобы не ресетить таймер сотни раз в секунду
      const bursty$ = merge(
        fromEvent<Event>(document, 'scroll', passive),
        fromEvent<WheelEvent>(window, 'wheel', passive),
        fromEvent<TouchEvent>(window, 'touchstart', passive),
        fromEvent<TouchEvent>(window, 'touchmove', passive),
/*         fromEvent(document, 'visibilitychange').pipe(
          filter(() => document.hidden),
          tap(() => this.zone.run(() => this.onIdle(confirmMs)))
        ) */
        //s fromEvent<PointerEvent>(window, 'pointermove', passive), // можно убрать mousemove
      ).pipe(
        // один «сигнал активности» не чаще, чем раз в 250мс
        auditTime(250)
      );

      const activity$ = merge(discrete$, bursty$);

      this.sub = activity$
        .pipe(
          startWith(null), // сразу запустить первый таймер
          takeUntil(this.stop$), // корректный teardown всех fromEvent
          switchMap(() => timer(idleMs)) // любой сигнал активности — перезапуск таймера
        )
        .subscribe(() => this.zone.run(() => this.onIdle(confirmMs)));
    });
  }

  stop() {
    // триггерим и завершаем стоп-сабжект, освобождаем подписку
    this.stop$?.next();
    this.stop$?.complete();
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
        try {
          this.confirm.close();
        } catch {}
        resolve(v);
      };

      // запоминаем резолвер, чтобы кнопки из шаблона могли завершить промис
      this.resolver = finish;

      // обратный отсчёт
      const totalSec = Math.max(1, Math.round(timeoutMs / 1000));
      this._countdown$.next(totalSec);
      const tick$ = interval(1000)
        .pipe(takeUntil(this.stop$))
        .subscribe(() => {
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
        accept: () => finish(true), // если вдруг кликнут «встроенные» кнопки
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
