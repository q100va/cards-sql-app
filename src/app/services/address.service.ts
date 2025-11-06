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
} from '@shared/schemas/toponym.schema';
@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/toponyms`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(private msgWrapper: MessageWrapperService) {}

  // check if a toponym name is already taken.
  checkToponymName(
    type: string,
    name: string,
    id: number | null,
    addressFilter: AddressFilter
  ): Observable<ApiResponse<boolean>> {
    let params = new HttpParams().set('type', type).set('name', name);
    if (id != null) params = params.set('id', String(id));
    if (addressFilter.countries[0])
       console.log('HttpParams ', addressFilter.countries[0]);
      params = params.set('countryId', String(addressFilter.countries[0]));
    if (addressFilter.regions[0])
      params = params.set('regionId', String(addressFilter.regions[0]));
    if (addressFilter.districts[0])
      params = params.set('districtId', String(addressFilter.districts[0]));
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-toponym-name`, {
        params,
      })
      .pipe(
        validateResponse(z.boolean()),
        this.msgWrapper.messageTap('warn', {
          source: 'CreateToponymDialog',
          stage: 'checkToponymName',
          type: type,
          name: name,
        }),
        catchError(this.handleError)
      );
  }

  //save toponym
  saveToponym(
    type: ToponymType,
    id: number | null,
    mainValues: ToponymFormControlsValues,
    addressFilter: AddressFilter,
    operation: 'create' | 'view-edit'
  ): Observable<ApiResponse<Toponym>> {
    const addressPoint =
      operation == 'create' ? 'create-toponym' : 'update-toponym';
    let toponymData: SaveToponym = {
      type: type,
      ...mainValues,
    };
    if (id != null) toponymData.id = id;
    if (addressFilter.countries[0])
      toponymData.countryId = addressFilter.countries[0];
    if (addressFilter.regions[0])
      toponymData.regionId = addressFilter.regions[0];
    if (addressFilter.districts[0])
      toponymData.districtId = addressFilter.districts[0];

    return this.http
      .post<RawApiResponse>(
        `${this.BASE_URL}/${encodeURIComponent(addressPoint)}`,
        toponymData
      )
      .pipe(
        validateResponse(toponymSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          name: res.data.name,
        })),
        catchError(this.handleError)
      );
  }

  //get toponym by id
  getToponym(id: number, type: ToponymType): Observable<ApiResponse<Toponym>> {
    return this.http
      .get<RawApiResponse>(
        `${this.BASE_URL}/get-${encodeURIComponent(
          type
        )}-by-id/${encodeURIComponent(id)}`
      )
      .pipe(validateResponse(toponymSchema), catchError(this.handleError));
  }

  //get list of toponyms names for address-filter
  getListOfToponyms(
    ids: number[],
    typeOfToponym: 'countries' | 'regions' | 'districts' | 'localities'
  ): Observable<ApiResponse<ToponymNamesList>> {
    let params = new HttpParams();
    for (const id of ids) params = params.append('ids', String(id));
    params = params.set('typeOfToponym', typeOfToponym);
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-toponyms-list`, { params })
      .pipe(
        validateResponse(toponymNamesListSchema),
        catchError(this.handleError)
      );
  }

  //get list of toponyms for table with filter, sort and pagination
  getToponyms(
    type: ToponymType,
    filter: {
      searchValue: string;
      exactMatch: boolean;
      addressFilter: AddressFilter;
      sortParameters: {
        active: string;
        direction: '' | 'asc' | 'desc';
      };
    },
    pageSize: number,
    currentPage: number
  ): Observable<ApiResponse<{ toponyms: Toponym[]; length: number }>> {
    console.log('getToponyms filter', filter.exactMatch);
    let params = new HttpParams()
      .set('type', type)
      .set('search', filter.searchValue)
      .set('exact', String(filter.exactMatch))
      .set('sortBy', filter.sortParameters.active || 'name')
      .set('sortDir', filter.sortParameters.direction || 'asc')
      .set('page', String(currentPage))
      .set('pageSize', String(pageSize));

    for (const id of filter.addressFilter.countries ?? []) {
      params = params.append('countries', String(id));
    }
    for (const id of filter.addressFilter.regions ?? []) {
      params = params.append('regions', String(id));
    }
    for (const id of filter.addressFilter.districts ?? []) {
      params = params.append('districts', String(id));
    }
    for (const id of filter.addressFilter.localities ?? []) {
      params = params.append('localities', String(id));
    }

    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/toponyms`, {
        params,
      })
      .pipe(validateResponse(toponymsSchema), catchError(this.handleError));
  }

  // check if a toponym can be blocked or deleted
  checkPossibilityToDeleteToponym(
    type: string,
    id: number,
    destroy: boolean
  ): Observable<ApiResponse<number>> {
    let params = new HttpParams()
      .set('type', type)
      .set('id', String(id))
      .set('destroy', String(destroy));
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-toponym-before-delete`, {
        params,
      })
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'ToponymsList',
            stage: 'checkPossibilityToDeleteToponym',
            toponymId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  // delete or block toponym
  deleteToponym(
    type: string,
    id: number,
    destroy: boolean
  ): Observable<ApiResponse<null>> {
    let params = new HttpParams()
      .set('type', type)
      .set('id', String(id))
      .set('destroy', String(destroy));
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-toponym`, {
        params,
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  //populate toponyms
  createListOfToponyms(
    data: any,
    type: string
  ): Observable<ApiResponse<number>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/populate-toponyms`, {
        type,
        data: data,
      })
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          count: res.data,
        })),
        catchError(this.handleError)
      );
  }
}
