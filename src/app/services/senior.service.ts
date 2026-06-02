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
  RelationPick,
} from '../interfaces/advanced-model';
import { AddressFilter } from '../interfaces/toponym';
import { AllFilterParameters, GeneralFilter } from '../interfaces/base-list';
import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';
import {
  AcceptedChanges,
  Differences,
  differencesResponseSchema,
  SeniorRaw,
  SeniorRow,
  seniorSchema,
  seniorsSchema,
} from '../../../shared/schemas/senior.schema';
import { duplicatesSchema } from '../../../shared/schemas/common.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';
import { recipientsShortSchema } from '../../../shared/schemas/recipient.schema';
//import { SeniorRow } from '../pages/seniors-bulk-update/seniors-bulk-update.component';

export interface SeniorMainService extends OwnerMainService<
  Senior,
  SeniorDraft,
  SeniorChangingData,
  SeniorRestoringData,
  SeniorOutdatingData,
  SeniorDeletingData,
  { list: Senior[]; length: number }
> {
  getSeniorsPickList(id: number): Observable<RelationPick[]>;
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
      patronymic: ownerDraft.patronymic,
      lastName: ownerDraft.lastName,
      homeId: ownerDraft.homeId,
      birthDate: ownerDraft.birthDate,
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
    allFilterParameters: AllFilterParameters,
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
        homeOption: p.viewHomeOption,
        includeOutdated: p.includeOutdated,
      }),

      filters: ctrl.omitEmpty({
        general: ctrl.omitEmpty({
          dateBeginningRange: ctrl.toIsoRange(p.filter.dateBeginningRange),
          dateRestrictionRange: ctrl.toIsoRange(p.filter.dateRestrictionRange),
          dateExitRange: ctrl.toIsoRange(p.filter.dateExitRange),
          homes: p.filter.homes.map((h) => h.id),
          gender: p.filter.gender,
          details: p.filter.details.map((d) => d.value),
          noAddress: p.filter.noAddress,
          specialHome: p.filter.specialHome,
          acceptableForSchool: p.filter.acceptableForSchool,
          dayRange: p.filter.birthDate.dayRange,
          monthRange: p.filter.birthDate.monthRange,
          yearRange: p.filter.birthDate.yearRange,
          hideWithoutYear: p.filter.hideWithoutYear ? true : null,
          hideWithoutBirthday: p.filter.hideWithoutBirthday ? true : null,
        }),
        address: ctrl.omitEmpty({
          countries: p.addressFilter.countries,
          regions: p.addressFilter.regions,
          districts: p.addressFilter.districts,
          localities: p.addressFilter.localities,
        }),

        mode: ctrl.omitEmpty({
          //strictAddress: p.strongAddressFilter,
          //strictContact: p.strongContactFilter,
          strictDetail: p.strongDetailFilter,
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

  getSeniorsPickList(id: number): Observable<RelationPick[]> {
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
        map((res: ApiResponse<RelationPick[]>) => res.data),
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

  getSeniorsForOccasion(
    occasionId: number,
    homeId: number,
  ): Observable<ApiResponse<{ id: number; fullData: string }[]>> {
    return this.http
      .get<RawApiResponse>(
        `${this.BASE_URL}/get-seniors-for-occasion/${occasionId}/${homeId}`,
      )
      .pipe(
        validateResponse(recipientsShortSchema),
        catchError(this.handleError),
      );
  }

  compareLists(
    newList: SeniorRow[],
    homeName: string,
    commentsMode: boolean,
    chosenMonths: number[],
  ): Observable<ApiResponse<Differences>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/compare-seniors-lists/`, {
        newList,
        homeName,
        commentsMode,
        chosenMonths,
      })
      .pipe(
        validateResponse(differencesResponseSchema),
        catchError(this.handleError),
      );
  }

  updateList(
    admitted: SeniorRaw[],
    removed: SeniorRaw[],
    updated: { seniorId: number; changes: AcceptedChanges }[],
    homeId: number,
    dateOfUpdate: Date
  ): Observable<
    ApiResponse<{
      createdCount: number;
      removedCount: number;
      updatedCount: number;
    }>
  > {
    console.log('updateList');
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-seniors-list/`, {
        admitted,
        removed,
        updated,
        homeId,
        dateOfUpdate
      })
      .pipe(
        //validateNoSchemaResponse<null>('isNull'),
        validateResponse(
          z.object({
            createdCount: z.number(),
            removedCount: z.number(),
            updatedCount: z.number(),
          }),
        ),
        this.msgWrapper.messageTap('success', undefined, (res) => res.data),
        catchError(this.handleError),
      );
  }
}
