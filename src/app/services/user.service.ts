import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ChangedData, DeletingData, OutdatedData, OutdatingData, RestoringData, User } from '../interfaces/user';
import { environment } from '../../environments/environment';
import { AddressFilter } from '../interfaces/address-filter';
import { UserDraft } from '../interfaces/userDraft';
import { GeneralFilter } from '../interfaces/filter';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  constructor() {}

changePassword(userId: number, value: string): Observable<any> {
  const BACKEND_URL = environment.apiUrl;
  return this.http.post(BACKEND_URL + '/api/users/change-password/', {
    data: { userId, value },
  });
}

  checkUserName(userName: string, id: number | null): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/check-username/', {
      data: { userName: userName, id: id },
    });
  }
  checkUserData(user: UserDraft): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/check-user-data/', {
      data: user,
    });
  }
  saveUser(user: UserDraft): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/create-user', {
      data: user,
    });
  }
  saveUpdatedUser(id: number, updatedUserData: {
        changes: ChangedData;
        restoringData: RestoringData;
        outdatingData: OutdatingData;
        deletingData: DeletingData;
      }): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/update-user', {
      data: {id: id, updatedUserData: updatedUserData},
    });
  }

  getListOfUsers(
    allFilterParameters: {
      viewOption: string;
      notOnlyActual: boolean;
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
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/get-users/', {
      allFilterParameters: allFilterParameters,
      pageSize: pageSize,
      currentPage: currentPage,
    });
    //console.log('getListOfUsers service result', result);
   // return result;
  }

  getUser(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/users/get-user-by-id/' + id);
  }

  checkPossibilityToDeleteUser(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(
      BACKEND_URL + '/api/users/check-user-before-delete/' + id
    );
  }

  deleteUser(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.delete(BACKEND_URL + '/api/users/delete-user/' + id);
  }

  blockUser(id: number, causeOgBlocking: string): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.patch(BACKEND_URL + '/api/users/block-user/' + id, {
      data: causeOgBlocking,
    });
  }

  unblockUser(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.patch(BACKEND_URL + '/api/users/unblock-user/', {
      data: id,
    });
  }


}
