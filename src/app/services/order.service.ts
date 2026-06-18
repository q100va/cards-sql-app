import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';
import {
  Filter,
  Order,
  OrderDraft,
  OrderFilter,
  OrderFiltersData,
  orderFiltersDataSchema,
  orderSchema,
} from '../../../shared/schemas/order.schema';
import * as ctrl from '../utils/common-ctrls';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/orders`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(private msgWrapper: MessageWrapperService) {}

  //get list of toponyms names for address-filter
  getOrderFiltersData(): Observable<ApiResponse<OrderFiltersData>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-filters-data`)
      .pipe(
        validateResponse(orderFiltersDataSchema),
        catchError(this.handleError),
      );
  }

  checkOrder(
    volunteerId: number,
    occasionId: number,
  ): Observable<
    ApiResponse<
      {
        date: Date;
        userName: string;
        amount: number;
      }[]
    >
  > {
    const params = new HttpParams()
      .set('volunteerId', volunteerId)
      .set('occasionId', occasionId);

    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-order`, { params })
      .pipe(
        validateResponse(
          z.array(
            z.object({
              date: z.coerce.date(),
              userName: z.string(),
              amount: z.number(),
            }),
          ),
        ),
        catchError(this.handleError),
      );
  }

  createOrder(
    params: OrderDraft,
    filtersDraft: OrderFilter,
  ): Observable<ApiResponse<Order>> {
    const filters = ctrl.omitEmptyAndFalse({
      ...filtersDraft,
      addressCategory:
        filtersDraft.addressCategory === 1
          ? null
          : filtersDraft.addressCategory,
      gender: filtersDraft.gender === 1 ? null : filtersDraft.gender,
    });
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-order`, {
        params,
        filters,
      })
      .pipe(validateResponse(orderSchema), catchError(this.handleError));
  }
}
