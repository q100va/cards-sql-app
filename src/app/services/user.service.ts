import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { OutdatedData, User } from '../interfaces/user';
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
      data: { userName: userName, id: id },
    });
  }
  checkUserData(user: User): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/users/check-user-data/', {
      data: user,
    });
  }
  saveUser(user: User, operation: string): Observable<any> {
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
    return this.http.post(BACKEND_URL + '/api/users/get-users/', {
      allFilterParameters: allFilterParameters,
      pageSize: pageSize,
      currentPage: currentPage,
    }).pipe(
      map((res: any) => {
        for (let user of res.data.users) {
          user = this.transformUserData(user);
        }
        return res;
      })
    );
    //console.log('getListOfUsers service result', result);
   // return result;
  }

  getUser(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/users/get-user-by-id/' + id).pipe(
      map((res: any) => {
        res.data = this.transformUserData(res.data);
        return res;
      })
    );
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

  transformUserData(user: User): User {
    let orderedContacts: { [key: string]: string[] } = {};
    let outdatedData: {
      contacts?: { [key: string]: string[] };
      addresses?: {
        country: number | null;
        region: number | null;
        district: number | null;
        locality: number | null;
        isRestricted?: boolean;
      }[];
      names?: {
        firstName: string | null;
        patronymic: string | null;
        lastName: string | null;
        userName: string | null;
      }[];
    } = { contacts: {}, addresses: [], names: [] };
    let outdatedDataContacts: { [key: string]: string[] } = {};

    if (user.contacts) {
      for (let contact of user.contacts) {
        const isTelegram =
          contact.type === 'telegramNickname' ||
          contact.type === 'telegramPhoneNumber' ||
          contact.type === 'telegramId';

        const target = contact.isRestricted ? outdatedDataContacts : orderedContacts;

        if (isTelegram) {
          target['telegram'] = target['telegram'] || [];
          target['telegram'].push(contact.content);
        }

        target[contact.type] = target[contact.type] || [];
        target[contact.type].push(contact.content);
      }
    }
    outdatedData.contacts =
      outdatedDataContacts as (typeof outdatedData)['contacts'];
    user.orderedContacts = orderedContacts as typeof user.orderedContacts;

    if (user.addresses?.length > 0) {
      let outdatedDataAddresses: {
        country: { id: number; name: string } | null;
        region: { id: number; name: string } | null;
        district: { id: number; name: string } | null;
        locality: { id: number; name: string } | null;
        isRestricted?: boolean;
      }[] = [];
      for (let address of user.addresses) {
        if (address.isRestricted) {
          outdatedDataAddresses.push({
            country: address.country,
            region: address.region,
            district: address.district,
            locality: address.locality,
            isRestricted: address.isRestricted,
          });
        }
        const filteredAddresses = user.addresses.filter(
          (address) => !address.isRestricted
        );
        user.addresses =
          filteredAddresses.length > 0
            ? filteredAddresses
            : [
                {
                  country: null,
                  region: null,
                  district: null,
                  locality: null,
                  isRestricted: false,
                },
              ];

        outdatedData.addresses =
          outdatedDataAddresses as (typeof outdatedData)['addresses'];
      }
    } else {
      user.addresses = [
        {
          country: null,
          region: null,
          district: null,
          locality: null,
          isRestricted: false,
        },
      ];
    }
    if (user.outdatedNames?.length > 0) {
      outdatedData.names = user.outdatedNames.map((name) => ({
        firstName: name.firstName,
        patronymic: name.patronymic,
        lastName: name.lastName,
        userName: name.userName,
      }));
    }
    user.outdatedData = outdatedData as typeof user.outdatedData;

   // console.log('transformed user data:', user);

    return user;
  }
}
