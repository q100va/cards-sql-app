import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  ChangingData,
  DeletingData,
  OutdatingData,
  RestoringData,
  Partner,
  PartnerDraft,
  Duplicates,
} from '../interfaces/partner';
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
  duplicatesSchema,
  partnerSchema,
  partnersSchema,
} from '@shared/schemas/partner.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/partners`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(
    private msgWrapper: MessageWrapperService,
    private translateService: TranslateService
  ) {}

  checkOwnerData(ownerDraft: PartnerDraft): Observable<ApiResponse<Duplicates>> {
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

  savePartner(partnerDraft: PartnerDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-partner`, partnerDraft)
      .pipe(
        validateResponse(z.string()),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          partnerName: res.data,
        })),
        catchError(this.handleError)
      );
  }

  saveUpdatedPartner(
    id: number,
    updatedPartnerData: {
      changes: ChangingData;
      restoringData: RestoringData;
      outdatingData: OutdatingData;
      deletingData: DeletingData;
    }
  ): Observable<ApiResponse<Partner>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-partner`, {
        id,
        ...updatedPartnerData,
      })
      .pipe(
        validateResponse(partnerSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          partnerName: res.data.partnerName,
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
          affirmations: p.filter.affirmations,
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

  checkPossibilityToDeletePartner(id: number): Observable<ApiResponse<number>> {
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

  deletePartner(id: number): Observable<ApiResponse<null>> {
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

  blockPartner(
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

  unblockPartner(id: number): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/unblock-partner/`, { id })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }
}
