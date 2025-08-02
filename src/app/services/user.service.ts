import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { OutdatedData, User } from '../interfaces/user';
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
  saveUser(user: UserDraft, operation: string): Observable<any> {
    const addressPoint = operation == 'create' ? 'create-user' : 'update-user';
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/' + addressPoint, {
      data: user,
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
