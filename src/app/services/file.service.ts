import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private http = inject(HttpClient);

  constructor() {}

  downloadFile(filename: string): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/addresses/download/' + filename, {
      responseType: 'blob',
    });
  }

  createListOfAddressElement(data: any, typeOfData: string): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(
      BACKEND_URL + '/api/addresses/populate-' + typeOfData,
      {
        data: data,
      }
    );
  }

 /*   downloadFile(filename: string): Observable<any> {
        const BACKEND_URL = environment.apiUrl;
    try{
      const res = this.http
      .get(BACKEND_URL + '/api/addresses/download/' + filename, {
        responseType: 'blob',
      });
      return res;
    }
    catch (error: any) {

      //console.log(error);
      let errorResponse = error.response.data.text();
      const errorObj = JSON.parse(errorResponse);
       //console.log(errorObj) // log error to console
      return errorObj;

  }
  }
  parseErrorBlob(err: HttpErrorResponse): Observable<any> {
    const reader: FileReader = new FileReader();

    const obs = Observable.create((observer: any) => {
      reader.onloadend = (e: Event) => {
        observer.error(JSON.parse((<any>e.target).result));
        observer.complete();
      }
    });
    reader.readAsText(err.error);
    return obs;
}  */

  /* const getFileFromServer = async () => {
  try {
      const res = await axios.get('https://api.some-server.com', {responseType: 'blob'}).data;
  return res;
  }
  catch (error) {
      let errorResponse = await error.response.data.text();
      const errorObj = JSON.parse(response);
      return errorObj
      //console.log(errorObj) // log error to console
  }
} */
}
