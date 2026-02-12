import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  Senior,
  Duplicates,
  SeniorDraft,
  SeniorChangingData,
  SeniorDeletingData,
  SeniorOutdatingData,
  SeniorRestoringData,
  OwnerMainService,
  UpdatedOwnerData,
  CoordinationPick,
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
import {
  seniorSchema,
  seniorsSchema,
} from '../../../shared/schemas/senior.schema';
import { duplicatesSchema } from '../../../shared/schemas/common.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';

export interface SeniorMainService extends OwnerMainService<
  Senior,
  SeniorDraft,
  SeniorChangingData,
  SeniorRestoringData,
  SeniorOutdatingData,
  SeniorDeletingData,
  { list: Senior[]; length: number }
> {
  getSeniorsPickList(id: number): Observable<CoordinationPick[]>;
}

@Injectable({
  providedIn: 'root',
})
export class SeniorService implements SeniorMainService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/seniors`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(
    private msgWrapper: MessageWrapperService,
    private translateService: TranslateService,
  ) {}

  getOwnerName(owner: Senior) {
    const fn = owner['firstName'] ?? '';
    const pn = owner['patronymic'] ?? '';
    const ln = owner['lastName'] ?? '';
    return [fn, pn, ln].filter(Boolean).join(' ').trim();
  }

  checkOwnerData(ownerDraft: SeniorDraft): Observable<ApiResponse<Duplicates>> {
    let body = {
      id: ownerDraft.id,
      firstName: ownerDraft.firstName,
      lastName: ownerDraft.lastName,
    };
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/check-senior-data/`, body)
      .pipe(validateResponse(duplicatesSchema), catchError(this.handleError));
  }

  saveOwner(ownerDraft: SeniorDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-senior`, ownerDraft)
      .pipe(
        validateResponse(z.string()),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          seniorFullName: res.data,
        })),
        catchError(this.handleError),
      );
  }

  saveUpdatedOwner(
    id: number,
    updatedOwnerData: UpdatedOwnerData<
      SeniorChangingData,
      SeniorRestoringData,
      SeniorOutdatingData,
      SeniorDeletingData
    >,
  ): Observable<ApiResponse<Senior>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-senior`, {
        id,
        ...updatedOwnerData,
      })
      .pipe(
        validateResponse(seniorSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          seniorData: res.data,
        })),
        catchError(this.handleError),
      );
  }

  formCommentFilterValue(
    commentFilter: string[] | undefined,
  ): boolean | undefined {
    if (commentFilter && commentFilter.length === 1) {
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
    currentPage: number,
  ): Observable<ApiResponse<{ list: Senior[]; length: number }>> {
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
        general: ctrl.omitEmpty({
          affiliations: p.filter.affiliations,
          comment: this.formCommentFilterValue(p.filter.comment),
          hasHomes: this.formCommentFilterValue(p.filter.hasHomes),
          dateBeginningRange: ctrl.toIsoRange(p.filter.dateBeginningRange),
          dateRestrictionRange: ctrl.toIsoRange(p.filter.dateRestrictionRange),
          contactTypes: p.filter.contactTypes.map((c) => c.type),
          homes: p.filter.homes,
          homeRegions: p.filter.homeRegions,
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
      .post<RawApiResponse>(`${this.BASE_URL}/get-seniors`, dto)
      .pipe(validateResponse(seniorsSchema), catchError(this.handleError));
  }

  getById(id: number): Observable<ApiResponse<Senior>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-senior-by-id/${id}`)
      .pipe(validateResponse(seniorSchema), catchError(this.handleError));
  }

  getSeniorsPickList(id: number): Observable<CoordinationPick[]> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-list-of-seniors/${id}`)
      .pipe(
        validateResponse(
          z.array(
            z.object({
              id: z.number().int().positive(),
              name: z.string(),
            }),
          ),
        ),
        map((res: ApiResponse<CoordinationPick[]>) => res.data),
        catchError(this.handleError),
      );
  }

  checkPossibilityToDeleteOwner(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-senior-before-delete/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'SeniorsList',
            stage: 'checkPossibilityToDeleteSenior',
            seniorId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data }),
        ),
        catchError(this.handleError),
      );
  }

  deleteOwner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-senior/${id}`)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  blockOwner(
    id: number,
    causeOfRestriction: string,
  ): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/block-senior/`, {
        id,
        causeOfRestriction,
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }

  unblockOwner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/unblock-senior/`, { id })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError),
      );
  }
}
