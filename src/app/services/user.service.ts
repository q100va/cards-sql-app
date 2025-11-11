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
  User,
  UserDraft,
  Duplicates,
  ChangePassword,
} from '../interfaces/user';
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
  userSchema,
  usersSchema,
} from '@shared/schemas/user.schema';
import { TranslateService } from '@ngx-translate/core';
import * as ctrl from '../utils/common-ctrls';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/users`;
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(
    private msgWrapper: MessageWrapperService,
    private translateService: TranslateService
  ) {}

  checkUserName(
    userName: string,
    id: number | null
  ): Observable<ApiResponse<boolean>> {
    let params = new HttpParams().set('userName', userName);
    if (id != null) params = params.set('id', String(id));
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-user-name`, {
        params,
      })
      .pipe(
        validateResponse(z.boolean()),
        this.msgWrapper.messageTap('warn', {
          source: 'CreateUserDialog',
          stage: 'checkUserName',
          name: userName,
        }),
        catchError(this.handleError)
      );
  }

  checkUserData(user: UserDraft): Observable<ApiResponse<Duplicates>> {
    let body = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      contacts: user.draftContacts,
    };
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/check-user-data/`, body)
      .pipe(validateResponse(duplicatesSchema), catchError(this.handleError));
  }

  saveUser(userDraft: UserDraft): Observable<ApiResponse<string>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/create-user`, userDraft)
      .pipe(
        validateResponse(z.string()),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          userName: res.data,
        })),
        catchError(this.handleError)
      );
  }

  changePassword(
    userId: number,
    newPassword: string,
    currentPassword?: string
  ): Observable<ApiResponse<null>> {
    let body: ChangePassword = {
      userId,
      newPassword,
    };
    if (currentPassword) body.currentPassword = currentPassword;
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/change-password/`, body)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  saveUpdatedUser(
    id: number,
    updatedUserData: {
      changes: ChangingData;
      restoringData: RestoringData;
      outdatingData: OutdatingData;
      deletingData: DeletingData;
    }
  ): Observable<ApiResponse<User>> {
    return this.http
      .post<RawApiResponse>(`${this.BASE_URL}/update-user`, {
        id,
        ...updatedUserData,
      })
      .pipe(
        validateResponse(userSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          userName: res.data.userName,
        })),
        catchError(this.handleError)
      );
  }

  formCommentFilterValue(commentFilter: string[]): boolean | undefined {
    console.log("this.translateService.instant('NAV.FILTER.TELEGRAM_NICKNAME_OPT')", this.translateService.instant('NAV.FILTER.TELEGRAM_NICKNAME_OPT'));

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
  ): Observable<ApiResponse<{ list: User[]; length: number }>> {
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
          roles: p.filter.roles!.map((r) => r.id),
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
      .post<RawApiResponse>(`${this.BASE_URL}/get-users`, dto)
      .pipe(validateResponse(usersSchema), catchError(this.handleError));
  }

  getById(id: number): Observable<ApiResponse<User>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/get-user-by-id/${id}`)
      .pipe(validateResponse(userSchema), catchError(this.handleError));
  }

  checkPossibilityToDeleteUser(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<RawApiResponse>(`${this.BASE_URL}/check-user-before-delete/${id}`)
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'UsersList',
            stage: 'checkPossibilityToDeleteUser',
            userId: id,
            amountOfDependencies: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  deleteUser(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<RawApiResponse>(`${this.BASE_URL}/delete-user/${id}`)
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  blockUser(
    id: number,
    causeOfRestriction: string
  ): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/block-user/`, {
        id,
        causeOfRestriction,
      })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }

  unblockUser(id: number): Observable<ApiResponse<null>> {
    return this.http
      .patch<RawApiResponse>(`${this.BASE_URL}/unblock-user/`, { id })
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }
}
