import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Occasion } from '../../../../../shared/schemas/occasion.schema';
import { environment } from '../../../../environments/environment';
import { MessageWrapperService } from '../../../services/message.service';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { CreateRecipientDialogComponent } from './create-recipient-dialog.component';

describe('CreateRecipientDialogComponent home selection ownership', () => {
  let fixture: ComponentFixture<CreateRecipientDialogComponent>;
  let component: CreateRecipientDialogComponent;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/api/seniors/get-seniors-for-occasion/20`;
  const occasion: Occasion = {
    id: 20, type: 'OCCASION.BIRTHDAY.NAME', date: null, monthNameKey: null,
    month: '5', year: 2026, amount: 0, status: 'OCCASION.STATUS.OPEN',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRecipientDialogComponent],
      providers: [
        ...provideComponentTesting(),
        { provide: MAT_DIALOG_DATA, useValue: occasion },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CreateRecipientDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  it('loads eligible seniors for the selected home and current occasion', () => {
    component.onHomeSelected(10);
    const request = http.expectOne(`${base}/10`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ id: 101, fullData: 'Senior in Home A' }] });
    expect(component.seniors).toEqual([{ id: 101, fullData: 'Senior in Home A' }]);
    expect(component.isLoading).toBeFalse();
  });

  it('keeps Home B seniors when the older Home A lookup completes late', () => {
    component.onHomeSelected(10);
    const first = http.expectOne(`${base}/10`);
    component.onHomeSelected(20);
    const current = http.expectOne(`${base}/20`);
    current.flush({ data: [{ id: 202, fullData: 'Senior in Home B' }] });
    if (!first.cancelled) first.flush({ data: [{ id: 101, fullData: 'Senior in Home A' }] });
    expect(component.seniors).toEqual([{ id: 202, fullData: 'Senior in Home B' }]);
  });

  it('keeps loading until the latest home lookup completes', () => {
    component.onHomeSelected(10);
    const first = http.expectOne(`${base}/10`);
    component.onHomeSelected(20);
    const current = http.expectOne(`${base}/20`);
    if (!first.cancelled) first.flush({ data: [] });
    expect(component.isLoading).toBeTrue();
    current.flush({ data: [] });
    expect(component.isLoading).toBeFalse();
  });
});
