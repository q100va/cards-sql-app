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
  Order,
  OrderDraft,
  OrderFilter,
  OrderFilterRegionsAndHomes,
  orderSchema,
  orderFilterRegionsAndHomesSchema,
  OrderQuery,
  OrderRecipients,
  orderRecipientsSchema,
  ordersListSchema,
  OrdersList,
  OrderDetails,
  orderDetailsSchema,
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
  getOrderFiltersData(): Observable<ApiResponse<OrderFilterRegionsAndHomes>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-filters-data`)
      .pipe(
        validateResponse(orderFilterRegionsAndHomesSchema),
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

  getOrders(query: OrderQuery): Observable<ApiResponse<OrdersList>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/get-orders`, query)
      .pipe(validateResponse(ordersListSchema), catchError(this.handleError));
  }

  getOrderById(id: number): Observable<ApiResponse<OrderDetails>> {
    console.log('id', id);
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/order/${id}`)
      .pipe(validateResponse(orderDetailsSchema), catchError(this.handleError));
  }

  editOrderRecipientsList(
    orderId: number,
    deletingIds: number[],
  ): Observable<ApiResponse<OrderDetails>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/edit-recipients`, {
        id: orderId,
        deletingIds,
      })
      .pipe(
        validateResponse(orderDetailsSchema),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  updateOrderStatus(id: number, status: number): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/update-status`, { id, status })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  deleteOrder(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-order/${id}`)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }


}
