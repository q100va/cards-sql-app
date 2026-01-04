import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  Home,
  Duplicates,
  HomeDraft,
  HomeChangingData,
  HomeDeletingData,
  HomeOutdatingData,
  HomeRestoringData,
  OwnerMainService,
  UpdatedOwnerData,
} from '../interfaces/advanced-model';
import { AddressFilter } from '../interfaces/toponym';
import { GeneralFilter } from '../interfaces/base-list';
import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';
//import { homeSchema, homesSchema } from '@shared/schemas/home.schema';
//import { duplicatesSchema } from '@shared/schemas/common.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';
import { homeSchema, homesSchema } from '../../../shared/schemas/home.schema';
import { duplicatesSchema } from '../../../shared/schemas/common.schema';

export interface HomeMainService
  extends OwnerMainService<
    Home,
    HomeDraft,
    HomeChangingData,
    HomeRestoringData,
    HomeOutdatingData,
    HomeDeletingData,
    { list: Home[]; length: number }
  > {
  checkPossibilityToBlockHome(id: number): Observable<ApiResponse<number>>;
}

@Injectable({
  providedIn: 'root',
})
export class HomeService implements HomeMainService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/homes`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(
    private msgWrapper: MessageWrapperService,
    private translateService: TranslateService
  ) {}

  getOwnerName(owner: Home) {
    return owner['homeName'].trim();
  }
  checkOwnerData(ownerDraft: HomeDraft): Observable<ApiResponse<Duplicates>> {
    let body = {
      id: ownerDraft.id,
      homeName: ownerDraft.homeName,
    };
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/check-home-data/`, body)
      .pipe(validateResponse(duplicatesSchema), catchError(this.handleError));
  }

  saveOwner(ownerDraft: HomeDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-home`, ownerDraft)
      .pipe(
        validateResponse(z.string()),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          homeFullName: res.data,
        })),
        catchError(this.handleError)
      );
  }

  saveUpdatedOwner(
    id: number,
    updatedOwnerData: UpdatedOwnerData<
      HomeChangingData,
      HomeRestoringData,
      HomeOutdatingData,
      HomeDeletingData
    >
  ): Observable<ApiResponse<Home>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-home`, {
        id,
        ...updatedOwnerData,
      })
      .pipe(
        validateResponse(homeSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          homeData: res.data,
        })),
        catchError(this.handleError)
      );
  }

  formCommentFilterValue(commentFilter: string[]): boolean | undefined {
    if (commentFilter.length === 1) {
      return (
        commentFilter[0] ==
        this.translateService.instant('NAV.FILTER.WITH_COMMENT_OPT')
      );
    }
    return undefined;
  }

  getList(
    allFilterParameters: {
      viewOption: string;
      includeOutdated: boolean;
      searchValue: string;
      exactMatch: boolean;
      sortParameters: {
        active: string;
        direction: 'asc' | 'desc' | '';
      };
      filter: GeneralFilter;
      addressFilter: AddressFilter;
      strongAddressFilter: boolean;
      strongContactFilter: boolean;
    },
    pageSize: number,
    currentPage: number
  ): Observable<ApiResponse<{ list: Home[]; length: number }>> {
    const p = { ...allFilterParameters };
    const dto = {
      page: { size: pageSize, number: currentPage },
      sort:
        p.sortParameters.active && p.sortParameters.direction
          ? [
              {
                field: p.sortParameters.active,
                direction: p.sortParameters.direction,
              },
            ]
          : undefined,
      search: ctrl.omitEmpty({
        value: p.searchValue,
        exact: p.exactMatch || undefined,
      }),
      view: ctrl.omitEmpty({
        option: p.viewOption,
        includeOutdated: p.includeOutdated,
      }),
      filters: ctrl.omitEmpty({
        //TODO: добавить фильтров
        general: ctrl.omitEmpty({
          //affiliations: p.filter.affiliations,
          comment: this.formCommentFilterValue(p.filter.comment),
          dateBeginningRange: ctrl.toIsoRange(p.filter.dateBeginningRange),
          dateRestrictionRange: ctrl.toIsoRange(p.filter.dateRestrictionRange),
          contactTypes: p.filter.contactTypes.map((c) => c.type),
        }),
        address: ctrl.omitEmpty({
          countries: p.addressFilter.countries,
          regions: p.addressFilter.regions,
          districts: p.addressFilter.districts,
          localities: p.addressFilter.localities,
        }),
        mode: ctrl.omitEmpty({
          strictAddress: p.strongAddressFilter,
          strictContact: p.strongContactFilter,
        }),
      }),
    };
    console.log('dto', dto);
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/get-homes`, dto)
      .pipe(validateResponse(homesSchema), catchError(this.handleError));
  }

  getById(id: number): Observable<ApiResponse<Home>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-home-by-id/${id}`)
      .pipe(validateResponse(homeSchema), catchError(this.handleError));
  }

  checkPossibilityToDeleteOwner(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-home-before-delete/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'HomesList',
            stage: 'checkPossibilityToDeleteHome',
            homeId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  deleteOwner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-home/${id}`)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  checkPossibilityToBlockHome(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-home-before-block/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'HomesList',
            stage: 'checkPossibilityToDeleteHome',
            homeId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  blockOwner(
    id: number,
    causeOfRestriction: string
  ): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/block-home/`, {
        id,
        causeOfRestriction,
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  unblockOwner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/unblock-home/`, { id })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }
}
