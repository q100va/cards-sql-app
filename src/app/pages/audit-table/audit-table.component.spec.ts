import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Observable } from 'rxjs';
import { AuditTableComponent } from './audit-table.component';
import { AuditService } from '../../services/audit.service';
import { MessageWrapperService } from '../../services/message.service';
import { FilterService } from 'primeng/api';
import { PaginatorState } from 'primeng/paginator';
import { AuditItem } from '@shared/schemas/audit.schema';

// ---- Mocks ------------------------------------------------------------------

class MockFilterService {
  register(_: string, __: any) {
    /* no-op */
  }
}

function apiResp(rows: AuditItem[] = [], count = 0) {
  return { data: { rows, count }, msg: 'OK' };
}

describe('AuditTableComponent', () => {
  let getAuditPageSpy: jasmine.Spy;

  const mockAuditService = {
    // вернём Observable, который сразу завершится
    getAuditPage: (_: any): Observable<any> => of(apiResp([], 0)),
  };

  const mockMsg = {
    handle: jasmine.createSpy('handle'),
    info: jasmine.createSpy('info'),
  };

  beforeEach(async () => {
    getAuditPageSpy = spyOn(mockAuditService, 'getAuditPage').and.callThrough();

    await TestBed.configureTestingModule({
      imports: [AuditTableComponent], // standalone component
      providers: [
        { provide: AuditService, useValue: mockAuditService },
        { provide: MessageWrapperService, useValue: mockMsg },
        { provide: FilterService, useClass: MockFilterService },
      ],
      // не важно, что в шаблоне — мы тестим логику
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function create(): { comp: AuditTableComponent; fixture: any } {
    const fixture = TestBed.createComponent(AuditTableComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    return { comp, fixture };
  }

  it('should load initial page with default filters (limit=10, offset=0)', fakeAsync(() => {
    const { comp } = create();
    // queueMicrotask
    flush();

    // debounce (150мс)
    tick(160);

    expect(getAuditPageSpy).toHaveBeenCalled();
    const firstCallArgs = getAuditPageSpy.calls.argsFor(0)[0];

    expect(firstCallArgs.limit).toBe(10);
    expect(firstCallArgs.offset).toBe(0);
    expect(firstCallArgs.model).toBeUndefined();
    expect(firstCallArgs.entityId).toBeUndefined();
    expect(firstCallArgs.action).toBeUndefined();
    expect(firstCallArgs.correlationId).toBeUndefined();
    expect(firstCallArgs.userId).toBeUndefined();
    expect(firstCallArgs.from).toBeUndefined();
    expect(firstCallArgs.to).toBeUndefined();
  }));

  it('should reset page to 0 and call service when filters change', fakeAsync(() => {
    const { comp } = create();
    flush();
    tick(160);
    getAuditPageSpy.calls.reset();
    comp.onFilter({
      entityId: { value: '  42  ' } as any,
    });
    tick(160);

    expect(getAuditPageSpy).toHaveBeenCalledTimes(1);
    const args = getAuditPageSpy.calls.mostRecent().args[0];

    expect(comp.pageIndex()).toBe(0);
    expect(args.offset).toBe(0);
    expect(args.entityId).toBe('42');
  }));

  it('should call service with updated limit/offset when page changes', fakeAsync(() => {
    const { comp } = create();
    flush();
    tick(160);
    getAuditPageSpy.calls.reset();

    const ev: PaginatorState = { rows: 25, first: 25 };
    comp.onPageChange(ev);

    expect(getAuditPageSpy).toHaveBeenCalledTimes(1);
    const args = getAuditPageSpy.calls.mostRecent().args[0];
    expect(args.limit).toBe(25);
    expect(args.offset).toBe(25);
  }));

  it('should convert selected Date range to ISO (start of day / next day, UTC)', fakeAsync(() => {
    const { comp } = create();
    flush();
    tick(160);
    getAuditPageSpy.calls.reset();

    const a = new Date(2025, 7, 1, 15, 45);
    const b = new Date(2025, 7, 2, 1, 0);

    let packed = '';
    comp.rangeDates = [a, b];
    comp.onRangeSelect((v: any) => (packed = String(v)));

    comp.onFilter({ date: { value: packed } as any });
    tick(160);

    expect(getAuditPageSpy).toHaveBeenCalledTimes(1);
    const args = getAuditPageSpy.calls.mostRecent().args[0];

    const expectedFrom = new Date(
      Date.UTC(2025, 7, 1, 0, 0, 0, 0)
    ).toISOString();
    const expectedTo = new Date(Date.UTC(2025, 7, 3, 0, 0, 0, 0)).toISOString();

    expect(args.from).toBe(expectedFrom);
    expect(args.to).toBe(expectedTo);
  }));

  it('should convert single selected Date to [start, nextStart) ISO interval', fakeAsync(() => {
    const { comp } = create();
    flush();
    tick(160);
    getAuditPageSpy.calls.reset();

    const a = new Date(2025, 7, 15, 23, 59);
    let packed = '';
    comp.rangeDates = [a, null];
    comp.onRangeSelect((v: any) => (packed = String(v)));

    comp.onFilter({ date: { value: packed } as any });
    tick(160);

    const args = getAuditPageSpy.calls.mostRecent().args[0];

    const expectedFrom = new Date(
      Date.UTC(2025, 7, 15, 0, 0, 0, 0)
    ).toISOString();
    const expectedTo = new Date(
      Date.UTC(2025, 7, 16, 0, 0, 0, 0)
    ).toISOString();

    expect(args.from).toBe(expectedFrom);
    expect(args.to).toBe(expectedTo);
  }));

  it('should trim and normalize empty strings to undefined', fakeAsync(() => {
    const { comp } = create();
    flush();
    tick(160);
    getAuditPageSpy.calls.reset();

    comp.onFilter({
      model: { value: '   ' } as any,
      correlationId: { value: '' } as any,
      userId: { value: ' 7  ' } as any,
    });
    tick(160);

    const args = getAuditPageSpy.calls.mostRecent().args[0];
    expect(args.model).toBeUndefined();
    expect(args.correlationId).toBeUndefined();
    expect(args.userId).toBe('7');
  }));

  it('should NOT call service when filters are effectively unchanged', fakeAsync(() => {
    const { comp } = create();
    flush();
    tick(160);
    getAuditPageSpy.calls.reset();

      comp.onFilter({
      model: { value: 'role' } as any,
      entityId: { value: '42' } as any,
      action: { value: '' } as any,
      userId: { value: '' } as any,
      date: { value: '' } as any,
      correlationId: { value: '' } as any,
    });
    tick(160);
    expect(getAuditPageSpy).toHaveBeenCalledTimes(1);

     comp.onFilter({
      model: { value: 'role' } as any,
      entityId: { value: '42' } as any,
      action: { value: '' } as any,
      userId: { value: '' } as any,
      date: { value: '' } as any,
      correlationId: { value: '' } as any,
    });
    tick(160);
    expect(getAuditPageSpy).toHaveBeenCalledTimes(1);

      comp.onFilter({
      model: { value: '  role  ' } as any,
      entityId: { value: '  42 ' } as any,
      action: { value: '   ' } as any,
      userId: { value: '' } as any,
      date: { value: '   ' } as any,
      correlationId: { value: '' } as any,
    });
    tick(160);
    expect(getAuditPageSpy).toHaveBeenCalledTimes(1);

    comp.onFilter({
      model: { value: 'user' } as any,
      entityId: { value: '42' } as any,
      action: { value: '' } as any,
      userId: { value: '' } as any,
      date: { value: '' } as any,
      correlationId: { value: '' } as any,
    });
    tick(160);
    expect(getAuditPageSpy).toHaveBeenCalledTimes(2);
  }));

  it('resets pageIndex once when multiple filters change before debounce', fakeAsync(() => {
  const { comp } = create();
  flush(); tick(160);
  getAuditPageSpy.calls.reset();

   comp.onPageChange({ rows: 10, first: 20 });
  expect(comp.pageIndex()).toBe(2);
  getAuditPageSpy.calls.reset();

  comp.onFilter({ entityId: { value: '42' } as any });
  comp.onFilter({ model: { value: 'role' } as any });

  tick(160);

  expect(comp.pageIndex()).toBe(0);
  expect(getAuditPageSpy).toHaveBeenCalledTimes(1);
  const args = getAuditPageSpy.calls.mostRecent().args[0];
  expect(args.offset).toBe(0);
}));

it('keeps pageIndex=0 even if a page event interleaves filter changes', fakeAsync(() => {
  const { comp } = create();
  flush();
  tick(160);
  getAuditPageSpy.calls.reset();

  comp.onPageChange({ rows: 25, first: 25 });
  expect(comp.pageIndex()).toBe(1);
  getAuditPageSpy.calls.reset();

  comp.onFilter({ model: { value: 'role' } as any });

  comp.onPageChange({ rows: 25, first: 50 });

  comp.onFilter({ entityId: { value: '99' } as any });

  tick(160);

  expect(comp.pageIndex()).toBe(0);
  expect(getAuditPageSpy).toHaveBeenCalledTimes(2);
  const args = getAuditPageSpy.calls.mostRecent().args[0];
  expect(args.limit).toBe(25);
  expect(args.offset).toBe(0);
}));

});
