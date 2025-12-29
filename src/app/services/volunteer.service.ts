import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  Volunteer,
  Duplicates,
  VolunteerDraft,
  VolunteerChangingData,
  VolunteerDeletingData,
  VolunteerOutdatingData,
  VolunteerRestoringData,
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
import { volunteerSchema, volunteersSchema } from '@shared/schemas/volunteer.schema';
import { duplicatesSchema } from '@shared/schemas/common.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';

export interface VolunteerMainService
  extends OwnerMainService<
    Volunteer,
    VolunteerDraft,
    VolunteerChangingData,
    VolunteerRestoringData,
    VolunteerOutdatingData,
    VolunteerDeletingData,
    { list: Volunteer[]; length: number }
  > {
  checkPossibilityToBlockVolunteer(id: number): Observable<ApiResponse<number>>;
}

@Injectable({
  providedIn: 'root',
})
export class VolunteerService implements VolunteerMainService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/volunteers`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(
    private msgWrapper: MessageWrapperService,
    private translateService: TranslateService
  ) {}

  getOwnerName(owner: Volunteer){
  const fn = owner['firstName'] ?? '';
  const pn = owner['patronymic'] ?? '';
  const ln = owner['lastName'] ?? '';
  return [fn, pn, ln].filter(Boolean).join(' ').trim();
  }

  checkOwnerData(
    ownerDraft: VolunteerDraft
  ): Observable<ApiResponse<Duplicates>> {
    let body = {
      id: ownerDraft.id,
      firstName: ownerDraft.firstName,
      lastName: ownerDraft.lastName,
      contacts: ownerDraft.draftContacts,
    };
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/check-volunteer-data/`, body)
      .pipe(validateResponse(duplicatesSchema), catchError(this.handleError));
  }

  saveOwner(ownerDraft: VolunteerDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-volunteer`, ownerDraft)
      .pipe(
        validateResponse(z.string()),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          volunteerFullName: res.data,
        })),
        catchError(this.handleError)
      );
  }

  saveUpdatedOwner(
    id: number,
    updatedOwnerData: UpdatedOwnerData<
      VolunteerChangingData,
      VolunteerRestoringData,
      VolunteerOutdatingData,
      VolunteerDeletingData
    >
  ): Observable<ApiResponse<Volunteer>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-volunteer`, {
        id,
        ...updatedOwnerData,
      })
      .pipe(
        validateResponse(volunteerSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          volunteerData: res.data,
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
  ): Observable<ApiResponse<{ list: Volunteer[]; length: number }>> {
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
      .post<RawApiResponse>(`${this.BASE_URL}/get-volunteers`, dto)
      .pipe(validateResponse(volunteersSchema), catchError(this.handleError));
  }

  getById(id: number): Observable<ApiResponse<Volunteer>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-volunteer-by-id/${id}`)
      .pipe(validateResponse(volunteerSchema), catchError(this.handleError));
  }

  checkPossibilityToDeleteOwner(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-volunteer-before-delete/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'VolunteersList',
            stage: 'checkPossibilityToDeleteVolunteer',
            volunteerId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  deleteOwner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-volunteer/${id}`)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  checkPossibilityToBlockVolunteer(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-volunteer-before-block/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'VolunteersList',
            stage: 'checkPossibilityToDeleteVolunteer',
            volunteerId: id,
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
      .patch<RawApiResponse>(`${this.BASE_URL}/block-volunteer/`, {
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
      .patch<RawApiResponse>(`${this.BASE_URL}/unblock-volunteer/`, { id })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }
}
