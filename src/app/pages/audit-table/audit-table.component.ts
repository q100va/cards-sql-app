// Angular core & RxJS
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, merge, of } from 'rxjs';
import {
  map,
  scan,
  debounceTime,
  distinctUntilChanged,
  finalize,
  switchMap,
  tap,
} from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Angular Material
import { MatCardModule } from '@angular/material/card';

// PrimeNG
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { FilterMetadata, FilterService } from 'primeng/api';
import { PaginatorState } from 'primeng/paginator';

// App services, utils, schemas
import { AuditService } from '../../services/audit.service';
import { AuditItem } from '@shared/schemas/audit.schema';
import { MessageWrapperService } from '../../services/message.service';

// --- Types & constants -------------------------------------------------------

type AuditAction = '' | 'create' | 'update' | 'delete' | 'auth';

type Filters = {
  model: string;
  entityId: string;
  action: AuditAction;
  correlationId: string;
  userId: string;
  from: string; // ISO
  to: string; // ISO
};
type Page = { index: number; size: number };

type Event = { type: 'filters'; f: Filters } | { type: 'page'; p: Page };

type State = { f: Filters; p: Page };

const DEFAULT_FILTERS: Filters = {
  model: '',
  entityId: '',
  action: '',
  correlationId: '',
  userId: '',
  from: '',
  to: '',
};

const MODELS = [
  'role',
  'operation',
  'user',
  'country',
  'region',
  'district',
  'locality',
  'session'
] as const;

const ACTIONS: Exclude<AuditAction, ''>[] = ['create', 'update', 'delete', 'auth'];

// --- Component ---------------------------------------------------------------

@Component({
  standalone: true,
  selector: 'app-audit-table',
  templateUrl: './audit-table.component.html',
  styleUrls: ['./audit-table.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    TableModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    PaginatorModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    ButtonModule,
    DatePicker,
  ],
})
export class AuditTableComponent {
  // DI
  private readonly destroyRef = inject(DestroyRef);
  private readonly filterService = inject(FilterService);
  private readonly auditService = inject(AuditService);
  private readonly msgWrapper = inject(MessageWrapperService);

  // Table state
  readonly records = signal<AuditItem[]>([]);
  readonly isLoading = signal(false);

  // Server-side pagination
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly total = signal(0);

  // UI options
  readonly models = [...MODELS];
  readonly actions = [...ACTIONS];

  // Inline header inputs (enter-to-apply)
  rangeDates: [Date | null, Date | null] | null = null;
  pendingEntityId = '';
  pendingUserId = '';
  pendingCorrelationId = '';

  // Streams
  private readonly filters$ = new Subject<Filters>();
  private readonly page$ = new Subject<{ index: number; size: number }>();

  // Soft loader
  private loadingTimer?: ReturnType<typeof setTimeout>;
  private readonly loaderDelayMs = 180;

  constructor() {
    // Disable local filtering for columns where we handle it on server
    this.filterService.register('passThrough', () => true);

    // shallow equality helpers
    const eqPage = (a: Page, b: Page) =>
      a.index === b.index && a.size === b.size;
    const eqFilters = (a: Filters, b: Filters) =>
      a.model === b.model &&
      a.entityId === b.entityId &&
      a.action === b.action &&
      a.correlationId === b.correlationId &&
      a.userId === b.userId &&
      a.from === b.from &&
      a.to === b.to;

    // ---- Streams ----------------------------------------------------------------

    // 1) Normalize input streams (optional debounce on filters)
    const filtersInput$ = this.filters$.pipe(
      // wait a tiny bit if user changes multiple filter fields quickly
      debounceTime(150),
      // only emit when the *whole filters object* actually changed
      distinctUntilChanged(eqFilters)
    );

    const pageInput$ = this.page$.pipe(distinctUntilChanged(eqPage));

    // 2) Merge into a single event stream + provide initial values
    const events$: Observable<Event> = merge(
      filtersInput$.pipe(map((f) => ({ type: 'filters', f } as const))),
      pageInput$.pipe(map((p) => ({ type: 'page', p } as const))),
      // initial values
      of<Event>({ type: 'filters', f: DEFAULT_FILTERS }),
      of<Event>({
        type: 'page',
        p: { index: this.pageIndex(), size: this.pageSize() },
      })
    );

    // 3) Reduce events into state (filters + page)
    //    IMPORTANT: on any filters change we reset page.index to 0 *before* making the request.
    const state$ = events$.pipe(
      scan<Event, State>(
        (state, ev) => {
          if (ev.type === 'filters') {
            const next: State = {
              f: ev.f,
              p: { index: 0, size: state.p.size },
            };
            this.pageIndex.set(0);
            this.pageSize.set(next.p.size);
            return next;
          } else {
            const next: State = { f: state.f, p: ev.p };
            this.pageIndex.set(ev.p.index);
            this.pageSize.set(ev.p.size);
            return next;
          }
        },
        {
          f: DEFAULT_FILTERS,
          p: { index: this.pageIndex(), size: this.pageSize() },
        }
      ),
      // avoid firing HTTP calls if state didn't actually change
      distinctUntilChanged((a, b) => eqPage(a.p, b.p) && eqFilters(a.f, b.f))
    );

    // ---- Data loading pipeline ---------------------------------------------------

    state$
      .pipe(
        tap(() => this.setLoadingSoft(true)),
        switchMap(({ f, p }) =>
          this.auditService
            .getAuditPage({
              model: this.norm(f.model),
              entityId: this.norm(f.entityId),
              action: f.action || undefined,
              correlationId: this.norm(f.correlationId),
              userId: this.norm(f.userId),
              from: this.norm(f.from),
              to: this.norm(f.to),
              limit: p.size,
              offset: p.index * p.size, // ← correct offset always (0 after filters change)
            })
            .pipe(finalize(() => this.setLoadingSoft(false)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.records.set(res.data.rows);
          this.total.set(res.data.count);
          console.log('Audit data loaded, total:', this.total());
        },
        error: (err) => {
          this.msgWrapper.handle(err);
        },
      });

    // Initial load
    queueMicrotask(() => {
      this.filters$.next({ ...DEFAULT_FILTERS });
      this.page$.next({ index: this.pageIndex(), size: this.pageSize() });
    });

    // Ensure delayed loader won't fire after destroy
    this.destroyRef.onDestroy(() => clearTimeout(this.loadingTimer));
  }

  // TrackBy to reduce DOM churn
  rowTrackBy = (_: number, row: { id: unknown }) => row.id;

  // --- Event handlers --------------------------------------------------------

  /** Called from `<p-table (onFilter)>` */
  onFilter(meta?: Record<string, FilterMetadata | undefined>) {
    if (!meta) return;
    console.log('Filters changed:', meta);
    console.log('Filters changed:', this.readFilters(meta));
    this.filters$.next(this.readFilters(meta));
  }

  /** Blur helper for Enter-to-apply inputs */
  blur(input: HTMLInputElement) {
    input.blur();
  }

  /** Called from date range picker */

  private toISOStart(d: Date): string {
    // начало дня (UTC)
    const dt = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
    );
    return dt.toISOString();
  }
  private toISOEndExclusive(d: Date): string {
    // начало следующего дня (UTC), эксклюзивная верхняя граница
    const dt = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0)
    );
    return dt.toISOString();
  }
  private packRange(a?: Date | null, b?: Date | null): string {
    if (!a && !b) return '';
    const from = a ? this.toISOStart(a) : '';
    const to = b
      ? this.toISOEndExclusive(b)
      : a
      ? this.toISOEndExclusive(a)
      : '';
    return `${from}|${to}`; //
  }

  onRangeSelect(filterCb: (v: any) => void) {
    console.log('onRangeSelect', this.rangeDates);
    const [a, b] = this.rangeDates ?? [null, null];
    if (a && b) {
      filterCb(this.packRange(a, b));
    } else if (a && !b) {
      filterCb(this.packRange(a, null));
    }
  }

  // --- Rendering helpers -----------------------------------------------------

  isUpdate(it: AuditItem) {
    return Boolean((it.diff as any)?.changed);
  }

  changedPairs(it: AuditItem) {
    const changed = ((it.diff as any)?.changed ?? {}) as Record<
      string,
      [unknown, unknown]
    >;
    return Object.entries(changed).map(([key, [from, to]]) => ({
      key,
      from: this.valToText(from),
      to: this.valToText(to),
    }));
  }

  snapshot(it: AuditItem) {
    const d = it.diff as any;
    const obj = d?.after ?? d?.before ?? {};
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text);
    this.msgWrapper.info('Copied to clipboard');
  }

  norm(v: string | null | undefined) {
    return v && v.trim() ? v.trim() : undefined;
  }

  // --- Internals -------------------------------------------------------------

  private setLoadingSoft(on: boolean) {
    if (on) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = setTimeout(
        () => this.isLoading.set(true),
        this.loaderDelayMs
      );
    } else {
      clearTimeout(this.loadingTimer);
      this.isLoading.set(false);
    }
  }

  /** Robustly reads filter values (supports both `value` and `constraints[0].value`) */
  private readFilters(
    meta: Record<string, FilterMetadata | undefined>
  ): Filters {
    const pick = (k: string) => {
      const f = meta[k] as any;
      const v = f?.value ?? f?.constraints?.[0]?.value ?? '';
      return (v ?? '').toString().trim();
    };
    const dr = pick('date');
    let from: string | undefined;
    let to: string | undefined;
    if (dr) {
      const [a, b] = dr.split('|');
      if (a) from = a;
      if (b) to = b;
    }
    return {
      model: pick('model'),
      entityId: pick('entityId'),
      action: pick('action'),
      correlationId: pick('correlationId'),
      userId: pick('userId'),
      from: from ?? '',
      to: to ?? '',
    };
    // Note: pagination/sort are handled via `page$` (and optionally separate sort$ if you add it)
  }

  private valToText(v: unknown) {
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if ('masked' in o) return String(o['masked']);
      if ('hash' in o) return `#${String(o['hash']).slice(0, 8)}…`;
    }
    return String(v ?? '');
  }

  // Called from <p-paginator (onPageChange)>
  onPageChange(e: PaginatorState) {
    const size = e.rows ?? this.pageSize();
    const index = Math.floor((e.first ?? 0) / size);
    if (size !== this.pageSize()) this.pageSize.set(size);
    if (index !== this.pageIndex()) this.pageIndex.set(index);
    this.page$.next({ index, size });
  }
}
