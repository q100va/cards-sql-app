import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuditService } from './audit.service';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/api-response';
import { AuditPage } from '@shared/schemas/audit.schema';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should GET with only non-empty params (drop undefined/empty)', () => {
    const resp: ApiResponse<AuditPage> = {
      data: { rows: [], count: 0 },
      msg: 'OK',
    };

    service
      .getAuditPage({
        model: 'role',
        entityId: '', // должно быть отброшено
        action: undefined, // должно быть отброшено
        correlationId: 'abc-123',
        userId: undefined, // отброс
        from: undefined, // отброс
        to: undefined, // отброс
        limit: 10,
        offset: 30,
      })
      .subscribe((r) => {
        expect(r.data.count).toBe(0);
      });

    const req = httpMock.expectOne(
      (u) => u.url === `${environment.apiUrl}/api/audit`
    );

    expect(req.request.method).toBe('GET');
    const p = req.request.params;

    expect(p.get('model')).toBe('role');
    expect(p.get('correlationId')).toBe('abc-123');
    expect(p.get('limit')).toBe('10');
    expect(p.get('offset')).toBe('30');

    // не должны присутствовать
    expect(p.has('entityId')).toBeFalse();
    expect(p.has('action')).toBeFalse();
    expect(p.has('userId')).toBeFalse();
    expect(p.has('from')).toBeFalse();
    expect(p.has('to')).toBeFalse();

    req.flush(resp);
  });

  it('should propagate HttpErrorResponse', () => {
    let caught: any;
    service
      .getAuditPage({
        model: undefined,
        entityId: undefined,
        action: undefined,
        correlationId: undefined,
        userId: undefined,
        from: undefined,
        to: undefined,
        limit: 20,
        offset: 0,
      })
      .subscribe({
        next: () => fail('should error'),
        error: (e) => (caught = e),
      });

    const req = httpMock.expectOne(
      (u) => u.url === `${environment.apiUrl}/api/audit`
    );
    req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    expect(caught?.status).toBe(500);
  });

  it('should throw if schema validation fails', () => {
    let caught: any;
    service
      .getAuditPage({
        model: undefined,
        entityId: undefined,
        action: undefined,
        correlationId: undefined,
        userId: undefined,
        from: undefined,
        to: undefined,
        limit: 20,
        offset: 0,
      })
      .subscribe({
        next: () => fail('should error due to invalid schema'),
        error: (e) => (caught = e),
      });

    const req = httpMock.expectOne(
      (u) => u.url === `${environment.apiUrl}/api/audit`
    );
    // data неверного формата — провалится в validateResponse(auditPageSchema)
    req.flush({ data: {}, msg: 'OK' });

    expect(caught).toBeTruthy();
    expect(String(caught)).toContain('Неверный формат данных ответа');
  });
});
