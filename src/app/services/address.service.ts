import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AbstractControl, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private http = inject(HttpClient);
  //private messageService = inject(MessageService);

  constructor() {}

  getCountries(): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/addresses/get-countries');
  }

  getRegions(): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/addresses/get-regions');
  }

  getDistricts(): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/addresses/get-districts');
  }

  getLocalities(
    filter: any /* {
      [key: string]: number[] | null | boolean | string | {[key: string]: number[] | null | string};
    } */,
    pageSize: number,
    currentPage: number
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/get-localities', {
      data: {
        filter: filter,
        pageSize: pageSize,
        currentPage: currentPage,
      },
    });
  }

  //address-filter

  getListOfCountries(): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/addresses/get-countries-list');
  }

  getListOfToponyms(idsOfToponym: number[], typeOfToponym: string): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/get-' + typeOfToponym + '-list', {
      data: idsOfToponym,
    });
  }

/*
  getListOfRegionsOfCountries(idsOfCountries: number[]): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/get-regions-list', {
      data: idsOfCountries,
    });
  }

  getListOfDistrictsOfRegions(idsOfRegions: number[]): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/get-districts-list', {
      data: idsOfRegions,
    });
  }

  getListOfLocalitiesOfDistricts(idsOfDistricts: number[]): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/get-localities-list', {
      data: idsOfDistricts,
    });
  } */

  //create toponym

  checkToponymName(
    type: string,
    name: string,
    addressFilter: { [key: string]: null | number[] | [] }
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/check-toponym-name', {
      data: {
        type: type,
        name: name,
        addressFilter: addressFilter,
      },
    });
  }

  createToponym(
    type: string,
    name: string,
    shortName: string,
    isFederalCity: boolean,
    isCapitalOfRegion: boolean,
    isCapitalOfDistrict: boolean,
    addressFilter: { [key: string]: null | number[] | [] }
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/addresses/create-toponym', {
      data: {
        type: type,
        name: name,
        shortName: shortName,
        addressFilter: addressFilter,
        isFederalCity: isFederalCity,
        isCapitalOfRegion: isCapitalOfRegion,
        isCapitalOfDistrict: isCapitalOfDistrict,
      },
    });
  }

  checkPossibilityToDeleteToponym(
    type: string,
    id: number,
    destroy: boolean
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    const path = destroy
      ? 'check-toponym-before-delete/'
      : 'check-toponym-before-block/';

    return this.http.get(
      BACKEND_URL + '/api/addresses/' + path + type + '/' + id
    );
  }

  deleteToponym(type: string, id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.delete(
      BACKEND_URL + '/api/addresses/delete-toponym/' + type + '/' + id
    );
  }
  blockToponym(type: string, id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.patch(
      BACKEND_URL + '/api/addresses/block-toponym/' + type + '/' + id, {}
    );
  }
}
