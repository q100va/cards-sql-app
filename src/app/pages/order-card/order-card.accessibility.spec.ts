import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { OccasionService } from '../../services/occasion.service';
import { OrderService } from '../../services/order.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { loadPublicTranslations } from '../../testing/public-translations.spec-fixtures';
import { OrderCardComponent } from './order-card.component';

describe('OrderCardComponent occasion navigation semantics', () => {
  let fixture: ComponentFixture<OrderCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ typeId: '1' })) } satisfies Pick<ActivatedRoute, 'paramMap'> },
      ],
    }).compileComponents();
    await loadPublicTranslations();
    spyOn(TestBed.inject(OccasionService), 'getActualOccasions').and.returnValue(of({ data: [
      { id: 20, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null, month: '5', year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN' },
      { id: 21, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null, month: '6', year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN' },
    ] }));
    spyOn(TestBed.inject(OrderService), 'getOrderFiltersData').and.returnValue(of({ data: { regions: [], homes: [] } }));
    fixture = TestBed.createComponent(OrderCardComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('names native non-submit previous/next buttons and preserves occasion navigation', () => {
    const host: HTMLElement = fixture.nativeElement;
    const previous = host.querySelector<HTMLButtonElement>('button[aria-label="Previous occasion"]');
    const next = host.querySelector<HTMLButtonElement>('button[aria-label="Next occasion"]');
    expect(previous).not.toBeNull();
    expect(next).not.toBeNull();
    if (!previous || !next) throw new Error('Expected named occasion navigation buttons');
    expect(previous.type).toBe('button');
    expect(next.type).toBe('button');
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeFalse();
    const component = fixture.componentInstance;
    expect(component.index).toBe(1);
    next.click();
    fixture.detectChanges();
    expect(component.index).toBe(0);
    expect(component.month).toBe('5');
    previous.click();
    fixture.detectChanges();
    expect(component.index).toBe(1);
    expect(component.month).toBe('6');
  });
});
