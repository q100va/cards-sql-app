import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MessageWrapperService } from '../../services/message.service';
import { provideComponentTesting } from '../../testing/component-test-providers';
import { AuditTableComponent } from './audit-table.component';

describe('AuditTableComponent HTTP recovery', () => {
  let fixture: ComponentFixture<AuditTableComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTableComponent], providers: provideComponentTesting(),
    }).compileComponents();
    spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('can request another page after a failed HTTP request', fakeAsync(() => {
    fixture = TestBed.createComponent(AuditTableComponent);
    const component = fixture.componentInstance;
    const url = `${environment.apiUrl}/api/audit`;
    const first = http.expectOne(req => req.url === url);
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    flushMicrotasks();
    tick(200);
    expect(component.isLoading()).toBeFalse();
    component.onPageChange({ first: 10, rows: 10 });
    const next = http.expectOne(req => req.url === url && req.params.get('offset') === '10');
    next.flush({ data: { rows: [], count: 0 } });
    expect(component.records()).toEqual([]);
    expect(component.total()).toBe(0);
  }));
});
