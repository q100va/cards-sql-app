import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import type { z } from 'zod';
import { environment } from '../../environments/environment';
import { validateResponse } from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';

import {
  type reportDTOSchema,
  reportSchema,
  ReportResponse,
  StatisticResponse,
  statisticSchema,
} from '../../../shared/schemas/report.schema';

type ReportRequest = z.infer<typeof reportDTOSchema>;

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  // Dependencies
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/reports`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  getReport(
    userId: ReportRequest['userId'],
    type: ReportRequest['type'],
    frequency: ReportRequest['frequency'],
    months: ReportRequest['months'],
    quarters: ReportRequest['quarters'],
    years: ReportRequest['years'],
  ): Observable<ApiResponse<ReportResponse>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/get-report/`, {
        userId,
        type,
        frequency,
        months,
        quarters,
        years,
      })
      .pipe(validateResponse(reportSchema), catchError(this.handleError));
  }

  getStatistic(): Observable<ApiResponse<StatisticResponse>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-statistic/`)
      .pipe(validateResponse(statisticSchema), catchError(this.handleError));
  }
}
