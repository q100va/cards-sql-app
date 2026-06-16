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
  Toponym,
  ToponymFormControlsValues,
  AddressFilter,
  ToponymType,
} from '../interfaces/toponym';

import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';
import {
  toponymSchema,
  SaveToponym,
  ToponymNamesList,
  toponymNamesListSchema,
  toponymsSchema,
} from '../../../shared/schemas/toponym.schema';
import { OrderFiltersData, orderFiltersDataSchema } from '../../../shared/schemas/order.schema';



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
}
