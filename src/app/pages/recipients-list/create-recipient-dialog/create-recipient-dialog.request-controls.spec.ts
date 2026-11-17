import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Occasion } from '../../../../../shared/schemas/occasion.schema';
import { environment } from '../../../../environments/environment';
import { MessageWrapperService } from '../../../services/message.service';
import { provideComponentTesting } from '../../../testing/component-test-providers';
import { CreateRecipientDialogComponent } from './create-recipient-dialog.component';

describe('CreateRecipientDialogComponent current home controls', () => {
  let fixture: ComponentFixture<CreateRecipientDialogComponent>;
  let component: CreateRecipientDialogComponent;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;
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
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CreateRecipientDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  function selectHome(id: number) {
    component.nursingHomeControl.setValue(id);
    component.onHomeSelected(id);
    return http.expectOne(`${base}/${id}`);
  }

  it('clears old options immediately and keeps the newest A lookup across Home A, B, and A again', () => {
    component.seniors = [{ id: 99, fullData: 'Previously eligible senior' }];
    const firstA = selectHome(10);
    expect(component.seniors).toEqual([]);
    const requestB = selectHome(20);
    const currentA = selectHome(10);
    currentA.flush({ data: [{ id: 103, fullData: 'Newest Home A senior' }] });
    if (!requestB.cancelled) requestB.flush({ data: [{ id: 202, fullData: 'Home B senior' }] });
    if (!firstA.cancelled) firstA.flush({ data: [{ id: 101, fullData: 'Old Home A senior' }] });
    expect(component.seniors).toEqual([{ id: 103, fullData: 'Newest Home A senior' }]);
    expect(component.nursingHomeControl.value).toBe(10);
    expect(component.isLoading).toBeFalse();
  });

  it('does not repopulate seniors after a pending home lookup is cleared', () => {
    const pending = selectHome(10);
    component.nursingHomeControl.setValue(null);
    component.onHomeSelected(null);
    expect(component.seniors).toEqual([]);
    expect(component.isLoading).toBeFalse();
    if (!pending.cancelled) pending.flush({ data: [{ id: 101, fullData: 'No longer selected Home A' }] });
    expect(component.seniors).toEqual([]);
    expect(component.nursingHomeControl.value).toBeNull();
    expect(component.isLoading).toBeFalse();
    expect(handle).not.toHaveBeenCalled();
  });

  it('ignores an obsolete home error while the current home owns loading and notifications', () => {
    const older = selectHome(10);
    const current = selectHome(20);
    if (!older.cancelled) older.flush({}, { status: 503, statusText: 'Obsolete home failure' });
    expect(component.isLoading).toBeTrue();
    expect(handle).not.toHaveBeenCalled();
    current.flush({}, { status: 502, statusText: 'Current home failure' });
    expect(component.isLoading).toBeFalse();
    expect(handle).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse), {
      source: 'CreateRecipientDialog', stage: 'onHomeSelected', occasionId: 20, homeId: 20,
    });
  });
});
