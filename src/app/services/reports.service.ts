import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  // Dependencies
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/occasions`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(private msgWrapper: MessageWrapperService) {}

  getReport(
    userId: number | null,
    type: number,
    frequency: string,
    months: number[] | null,
    quarters: number[] | null,
    years: number[]
  ): Observable<ApiResponse<null>>{
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/get-report/`, {
        userId,
        type,
        frequency,
        months,
        quarters,
        years
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        catchError(this.handleError),
      );
  }
}
