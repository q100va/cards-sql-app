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
  Recipient,
  recipientSchema,
  recipientsListSchema,
  RecipientQuery,
  recipientsShortSchema,
  RecipientsShortList,
} from '../../../shared/schemas/recipient.schema';
import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';
import { MatListOption } from '@angular/material/list';

@Injectable({ providedIn: 'root' })
export class RecipientService {
  // Dependencies
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/recipients`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(private msgWrapper: MessageWrapperService) {}

  // Create a new recipients list.
  createList(occasionId: number): Observable<ApiResponse<number>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-list`, { occasionId })
      .pipe(
        // validateResponse(z.string().trim()),
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          listLength: res.data,
        })),
        catchError(this.handleError),
      );
  }

  clearList(occasionId: number): Observable<ApiResponse<null>> {
    console.log('id', occasionId);
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/clear-list/`, { occasionId })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  checkList(occasionId: number): Observable<ApiResponse<{
    added: RecipientsShortList;
    returned: RecipientsShortList;
    absent: RecipientsShortList;
  }>> {
    console.log('id', occasionId);
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/check-list/`, { occasionId })
      .pipe(
        validateResponse(z.object(
          {
            added: recipientsShortSchema,
            returned: recipientsShortSchema,
            absent: recipientsShortSchema,
          })),
        //this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  getRecipientsByOccasion(
    query: RecipientQuery,
  ): Observable<ApiResponse<{ list: Recipient[]; length: number }>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/get-recipients`, query)
      .pipe(
        validateResponse(recipientsListSchema),
        catchError(this.handleError),
      );
  }

  // Create new recipients.
  createRecipients(
    seniorsIds: number[],
    occasionId: number,
  ): Observable<ApiResponse<number>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-recipients`, {
        seniorsIds,
        occasionId,
      })
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          name: res.data,
        })),
        catchError(this.handleError),
      );
  }

  /*
  // Get recipients and options (for the table).
  getRecipients(): Observable<
    ApiResponse<{ recipients: Recipient[]; options: Options }>
  > {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-recipients`)
      .pipe(
        validateResponse(recipientsListSchema),
        catchError(this.handleError),
      );
  } */

  // Delete recipient by id.
  deleteRecipients(
    recipientIds: number[],
    occasionId: number,
  ): Observable<ApiResponse<null>> {
    console.log('id', recipientIds);
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-recipients/`, {
        body: { recipientIds, occasionId },
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }
  /*  // Edit recipient by id.
  editRecipientStatus(id: number, status: number): Observable<ApiResponse<null>> {
    console.log('id', id);
    return this.http
      .patch<RawApiResponse>(
        `${this.BASE_URL}/edit-recipient/`,
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
  } */
}
