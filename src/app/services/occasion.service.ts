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

  // Get occasions and options (for the table).
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

  /*   // Get id/name pairs for dropdowns.
  getOccasionsNamesList(): Observable<ApiResponse<{ id: number; name: string }[]>> {
    return this.http
      .get<RawApiResponse>(
        `${this.BASE_URL}/get-occasions-names-list`
      )
      .pipe(
        validateResponse(occasionsNamesListSchema),
        catchError(this.handleError)
      );
  } */
  /*
  // Check if a occasion can be deleted (returns usernames string or empty).
  checkPossibilityToDeleteOccasion(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(
        `${this.BASE_URL}/check-occasion-before-delete/${encodeURIComponent(
          String(id)
        )}`
      )
      .pipe(
        // validateResponse(z.number().int().positive()),
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'OccasionsList',
            stage: 'checkPossibilityToDeleteOccasion',
            roleId: id,
            amountOfUsers: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  } */

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
  // Delete occasion by id.
  editOccasionStatus(id: number, status: number): Observable<ApiResponse<null>> {
    console.log('id', id);
    return this.http
      .patch<RawApiResponse>(
        `${this.BASE_URL}/edit-occasion/`,
        {
        id,
        status,
      }
      )
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }
}
