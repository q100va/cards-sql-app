import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../interfaces/user';
import { environment } from '../../environments/environment';
import { AddressFilter } from '../interfaces/address-filter';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);

  constructor() {}

  checkUserName(userName: string, id: number | null): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/check-username/', {
      data: {userName: userName, id: id}
    });
  }
  checkUserData(user: User): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/check-user-data/', {
      data: user,
    });
  }
  saveUser(user: User, operation: string,): Observable<any> {
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
      filter: {
        [key: string]: string[] | Date[] | null | { [key: string]: string }[];
      };
      addressFilter: AddressFilter;
      strongAddressFilter: boolean;
      strongContactFilter: boolean;
    },
    pageSize: number,
    currentPage: number
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    const result = this.http.post(BACKEND_URL + '/api/users/get-users/', {
      allFilterParameters: allFilterParameters,
      pageSize: pageSize,
      currentPage: currentPage,
    });
    console.log('getListOfUsers service result', result);
    return result;
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
