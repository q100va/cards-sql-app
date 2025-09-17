import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { AuditPage, auditPageSchema } from '@shared/schemas/audit.schema';
import { ApiResponse } from '../interfaces/api-response';
import { environment } from 'src/environments/environment';
import { validateResponse } from '../utils/validate-response';

@Injectable({ providedIn: 'root' })
export class AuditService {
  // Dependencies
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/audit`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  getAuditPage(params: {
    model: string | undefined;
    entityId: string | undefined;
    action: 'create' | 'update' | 'delete' | 'auth' | undefined;
    correlationId: string | undefined;
    userId: string | undefined;
    from: string| undefined; // ISO
    to: string| undefined; // ISO
    limit: number;
    offset: number;
  }): Observable<ApiResponse<AuditPage>> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v) !== '') {
        p = p.set(k, String(v));
        console.log({ k, v });
      }
    }
    return this.http
      .get<ApiResponse<AuditPage>>(this.BASE_URL, { params: p })
      .pipe(validateResponse(auditPageSchema), catchError(this.handleError));
  }
}
