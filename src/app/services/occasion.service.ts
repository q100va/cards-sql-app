import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Schemas & validators
import {
  Occasion,
  OccasionDraft,
  occasionSchema,
  occasionsListSchema,
  Options,
} from '../../../shared/schemas/occasion.schema';
import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';

@Injectable({ providedIn: 'root' })
export class OccasionService {
  // Dependencies
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/occasions`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(private msgWrapper: MessageWrapperService) {}

  // Check if a occasion name is already taken.
  checkOccasionData(draft: {
    type: number;
    year: number;
    month: number | null;
  }): Observable<ApiResponse<boolean>> {
    let params = new HttpParams().set('type', String(draft.type));
    params = params.set('year', String(draft.year));
    if (draft.month !== null) params = params.set('month', String(draft.month));
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-occasion-data`, {
        params,
      })
      .pipe(
        validateResponse(z.boolean()),
        //validateNoSchemaResponse<boolean>('isBoolean'),
        this.msgWrapper.messageTap('warn', {
          source: 'CreateOccasionDialog',
          stage: 'checkOccasionData',
          draft: draft,
        }),
        catchError(this.handleError),
      );
  }

  // Create a new occasion.
  createOccasion(occasion: OccasionDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-occasion`, occasion)
      .pipe(
        validateResponse(z.string().trim()),
        //validateNoSchemaResponse<string>('isString'),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          name: res.data,
        })),
        catchError(this.handleError),
      );
  }

  // Get occasions.
  getOccasions(): Observable<
    ApiResponse<{ occasions: Occasion[]; options: Options }>
  > {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-occasions`)
      .pipe(
        validateResponse(occasionsListSchema),
        catchError(this.handleError),
      );
  }

  getOccasionById(id: number): Observable<ApiResponse<Occasion>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-occasion-by-id/${id}`)
      .pipe(validateResponse(occasionSchema), catchError(this.handleError));
  }

  // Delete occasion by id.
  deleteOccasion(id: number): Observable<ApiResponse<null>> {
    console.log('id', id);
    return this.http
      .delete<RawApiResponse>(
        `${this.BASE_URL}/delete-occasion/${encodeURIComponent(String(id))}`,
      )
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }
  // Edit occasion by id.
  editOccasionStatus(
    id: number,
    status: number,
  ): Observable<ApiResponse<null>> {
    console.log('id', id);
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/edit-occasion/`, {
        id,
        status,
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  // Get occasions.
  getActualOccasions(typeId: string): Observable<ApiResponse<Occasion[]>> {
    return this.http
      .get<RawApiResponse>(
        `${this.BASE_URL}/get-actual-occasions/${encodeURIComponent(typeId)}`,
      )
      .pipe(
        validateResponse(z.array(occasionSchema)),
        catchError(this.handleError),
      );
  }
}
