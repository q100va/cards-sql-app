import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { validateResponse } from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';
import {
  Order,
  OrderDetails,
  OrderDraft,
  OrderEdit,
  OrderFilter,
  OrderFiltersData,
  orderDetailsSchema,
  orderFiltersDataSchema,
  OrderQuery,
  OrderRecipients,
  orderRecipientsSchema,
  ordersListSchema,
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
    orderDraft: OrderDraft,
    filtersDraft: OrderFilter,
  ): Observable<ApiResponse<{ contact: string; recipients: OrderRecipients }>> {
    const filters =
      ctrl.omitEmptyAndFalse({
        ...filtersDraft,
        addressCategory:
          filtersDraft.addressCategory === 1
            ? null
            : filtersDraft.addressCategory,
        gender: filtersDraft.gender === 1 ? null : filtersDraft.gender,
      }) ?? {};
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-order`, {
        orderDraft,
        filters,
      })
      .pipe(
        validateResponse(
          z.object({ contact: z.string(), recipients: orderRecipientsSchema }),
        ),
        catchError(this.handleError),
      );
  }

  getOrders(query: OrderQuery): Observable<
    ApiResponse<{
      list: Order[];
      length: number;
      options: {
        users: { id: number; userName: string }[];
        statuses: { value: number; label: string }[];
        sources: { value: number; label: string }[];
      };
    }>
  > {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/get-orders`, query)
      .pipe(validateResponse(ordersListSchema), catchError(this.handleError));
  }

  getOrderById(id: number): Observable<ApiResponse<OrderDetails>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/${id}`)
      .pipe(validateResponse(orderDetailsSchema), catchError(this.handleError));
  }

  updateOrder(
    id: number,
    draft: OrderEdit,
  ): Observable<ApiResponse<OrderDetails>> {
    return this.http
      .put<RawApiResponse>(`${this.BASE_URL}/${id}`, draft)
      .pipe(validateResponse(orderDetailsSchema), catchError(this.handleError));
  }
}
