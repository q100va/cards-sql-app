import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { AuditItem } from '../../../../shared/schemas/audit.schema';
import { environment } from '../../../environments/environment';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { AuditTableComponent } from './audit-table.component';

describe('AuditTableComponent recovery loading controls', () => {
  let fixture: ComponentFixture<AuditTableComponent>;
  let http: HttpTestingController;
  let handle: jasmine.Spy<MessageWrapperService['handle']>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTableComponent], providers: provideComponentTesting(),
    }).compileComponents();
    handle = spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('notifies once on failure and restores normal delayed loading and data updates on the next page', fakeAsync(() => {
    fixture = TestBed.createComponent(AuditTableComponent);
    const component = fixture.componentInstance;
    const url = `${environment.apiUrl}/api/audit`;
    const first = http.expectOne(request => request.url === url);
    flushMicrotasks();
    tick(200);
    expect(component.isLoading()).toBeTrue();
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.isLoading()).toBeFalse();
    expect(handle).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse));

    component.onPageChange({ first: 10, rows: 10 });
    const next = http.expectOne(request => request.url === url && request.params.get('offset') === '10');
    expect(next.request.params.get('limit')).toBe('10');
    tick(200);
    expect(component.isLoading()).toBeTrue();
    const row: AuditItem = {
      id: 101, action: 'update', model: 'role', entityId: '7',
      diff: { changed: { name: ['Old', 'New'] } }, actorUserId: 7,
      correlationId: null, ip: null, userAgent: null, createdAt: new Date('2026-05-01T12:00:00Z'),
    };
    next.flush({ data: { rows: [row], count: 11 } });
    expect(component.records()).toEqual([row]);
    expect(component.total()).toBe(11);
    expect(component.pageIndex()).toBe(1);
    expect(component.isLoading()).toBeFalse();
    expect(handle).toHaveBeenCalledTimes(1);
  }));
});
