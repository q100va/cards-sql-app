import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditService } from '../../services/audit.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { loadPublicTranslations } from '../../testing/public-translations.spec-fixtures';
import { AuditTableComponent } from './audit-table.component';

describe('AuditTableComponent filter control semantics', () => {
  let fixture: ComponentFixture<AuditTableComponent>;
  let component: AuditTableComponent;
  let getPage: jasmine.Spy<AuditService['getAuditPage']>;
  const textFilters = [
    { property: 'pendingEntityId', field: 'entityId', label: 'entity ID', value: '42' },
    { property: 'pendingUserId', field: 'userId', label: 'user ID', value: '7' },
    { property: 'pendingCorrelationId', field: 'correlationId', label: 'correlation ID', value: 'request-7' },
  ] as const;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTableComponent], providers: provideComponentTesting(),
    }).compileComponents();
    await loadPublicTranslations();
    getPage = spyOn(TestBed.inject(AuditService), 'getAuditPage').and.returnValue(of({ data: { rows: [], count: 0 } }));
  });

  function render() {
    fixture = TestBed.createComponent(AuditTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function button(name: string): HTMLButtonElement {
    const host: HTMLElement = fixture.nativeElement;
    const control = host.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
    expect(control).not.toBeNull();
    if (!control) throw new Error(`Expected native ${name} button`);
    expect(control.type).toBe('button');
    return control;
  }

  it('renders named native non-submit controls without making empty filters actionable', () => {
    render();
    for (const label of ['date range', ...textFilters.map(filter => filter.label)]) {
      for (const action of ['Apply', 'Clear']) {
        const control = button(`${action} ${label} filter`);
        expect(control.disabled).toBeTrue();
        expect(control.style.visibility).toBe('hidden');
      }
    }
  });

  it('preserves apply/clear callbacks for entity, user, and correlation filters', fakeAsync(() => {
    render();
    tick(160);
    const filterEvent = spyOn(component, 'onFilter').and.callThrough();
    for (const filter of textFilters) {
      component[filter.property] = filter.value;
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      const apply = button(`Apply ${filter.label} filter`);
      const clear = button(`Clear ${filter.label} filter`);
      expect(apply.disabled).toBeFalse();
      expect(clear.disabled).toBeFalse();
      apply.click();
      tick(150); // Existing Audit query debounce after the column filter callback.
      expect(filterEvent.calls.mostRecent().args[0]?.[filter.field]?.value).toBe(filter.value);
      expect(getPage.calls.mostRecent().args[0][filter.field]).toBe(filter.value);
      clear.click();
      tick(150);
      fixture.detectChanges();
      expect(component[filter.property]).toBe('');
      expect(getPage.calls.mostRecent().args[0][filter.field]).toBeUndefined();
      expect(clear.disabled).toBeTrue();
      expect(clear.style.visibility).toBe('hidden');
    }
  }));

  it('preserves date-range packing and the existing clear callback', fakeAsync(() => {
    render();
    tick(160);
    const filterEvent = spyOn(component, 'onFilter').and.callThrough();
    component.rangeDates = [new Date(2026, 4, 1), new Date(2026, 4, 2)];
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const apply = button('Apply date range filter');
    const clear = button('Clear date range filter');
    expect(apply.disabled).toBeFalse();
    apply.click();
    tick(150);
    expect(filterEvent.calls.mostRecent().args[0]?.['date']?.value)
      .toBe('2026-05-01T00:00:00.000Z|2026-05-03T00:00:00.000Z');
    expect(getPage.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      from: '2026-05-01T00:00:00.000Z', to: '2026-05-03T00:00:00.000Z',
    }));
    clear.click();
    tick(150);
    fixture.detectChanges();
    expect(component.rangeDates).toBeNull();
    expect(getPage.calls.mostRecent().args[0].from).toBeUndefined();
    expect(getPage.calls.mostRecent().args[0].to).toBeUndefined();
    expect(clear.disabled).toBeTrue();
  }));
});
