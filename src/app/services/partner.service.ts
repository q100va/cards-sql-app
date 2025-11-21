import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  Partner,
  Duplicates,
  PartnerDraft,
  PartnerChangingData,
  PartnerDeletingData,
  PartnerOutdatingData,
  PartnerRestoringData,
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
import { partnerSchema, partnersSchema } from '@shared/schemas/partner.schema';
import { duplicatesSchema } from '@shared/schemas/common.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';

export interface PartnerMainService
  extends OwnerMainService<
    Partner,
    PartnerDraft,
    PartnerChangingData,
    PartnerRestoringData,
    PartnerOutdatingData,
    PartnerDeletingData,
    { list: Partner[]; length: number }
  > {
  checkPossibilityToBlockPartner(id: number): Observable<ApiResponse<number>>;
}

@Injectable({
  providedIn: 'root',
})
export class PartnerService implements PartnerMainService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/partners`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(
    private msgWrapper: MessageWrapperService,
    private translateService: TranslateService
  ) {}

  getOwnerName(owner: Partner){
  const fn = owner['firstName'] ?? '';
  const pn = owner['patronymic'] ?? '';
  const ln = owner['lastName'] ?? '';
  return [fn, pn, ln].filter(Boolean).join(' ').trim();
  }

  checkOwnerData(
    ownerDraft: PartnerDraft
  ): Observable<ApiResponse<Duplicates>> {
    let body = {
      id: ownerDraft.id,
      firstName: ownerDraft.firstName,
      lastName: ownerDraft.lastName,
      contacts: ownerDraft.draftContacts,
    };
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/check-partner-data/`, body)
      .pipe(validateResponse(duplicatesSchema), catchError(this.handleError));
  }

  saveOwner(ownerDraft: PartnerDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-partner`, ownerDraft)
      .pipe(
        validateResponse(z.string()),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          partnerFullName: res.data,
        })),
        catchError(this.handleError)
      );
  }

  saveUpdatedOwner(
    id: number,
    updatedOwnerData: UpdatedOwnerData<
      PartnerChangingData,
      PartnerRestoringData,
      PartnerOutdatingData,
      PartnerDeletingData
    >
  ): Observable<ApiResponse<Partner>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-partner`, {
        id,
        ...updatedOwnerData,
      })
      .pipe(
        validateResponse(partnerSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          partnerData: res.data,
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
  ): Observable<ApiResponse<{ list: Partner[]; length: number }>> {
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
      .post<RawApiResponse>(`${this.BASE_URL}/get-partners`, dto)
      .pipe(validateResponse(partnersSchema), catchError(this.handleError));
  }

  getById(id: number): Observable<ApiResponse<Partner>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-partner-by-id/${id}`)
      .pipe(validateResponse(partnerSchema), catchError(this.handleError));
  }

  checkPossibilityToDeleteOwner(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-partner-before-delete/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'PartnersList',
            stage: 'checkPossibilityToDeletePartner',
            partnerId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  deleteOwner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-partner/${id}`)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  checkPossibilityToBlockPartner(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-partner-before-block/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'PartnersList',
            stage: 'checkPossibilityToDeletePartner',
            partnerId: id,
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
      .patch<RawApiResponse>(`${this.BASE_URL}/block-partner/`, {
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
      .patch<RawApiResponse>(`${this.BASE_URL}/unblock-partner/`, { id })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }
}
