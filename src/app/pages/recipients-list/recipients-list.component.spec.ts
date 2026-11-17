import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { OccasionService } from '../../services/occasion.service';
import { RecipientService } from '../../services/recipient.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipientsListComponent } from './recipients-list.component';

describe('RecipientsListComponent', () => {
  let component: RecipientsListComponent;
  let fixture: ComponentFixture<RecipientsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipientsListComponent],
      providers: [
        ...provideComponentTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ occasionId: '1' })) } satisfies Pick<ActivatedRoute, 'paramMap'>,
        },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(OccasionService), 'getOccasionById').and.returnValue(of({
      data: { id: 1, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null, month: null, year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN' },
    }));
    spyOn(TestBed.inject(RecipientService), 'getRecipientsByOccasion').and.returnValue(of({ data: { list: [], length: 0 } }));
    fixture = TestBed.createComponent(RecipientsListComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(TestBed.inject(OccasionService).getOccasionById).toHaveBeenCalledWith(1);
    expect(component.occasionId).toBe(1);
  });
});
