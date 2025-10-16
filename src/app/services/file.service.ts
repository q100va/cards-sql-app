import { Injectable, inject } from '@angular/core';
import { catchError, from, mergeMap, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageWrapperService } from './message.service';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/files`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (err: HttpErrorResponse) => {
  if (err.error instanceof Blob) {
    return from(err.error.text()).pipe(
      mergeMap((text) => {
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch {}
        const normalized = new HttpErrorResponse({
          error: parsed ?? { message: text },
          headers: err.headers, status: err.status, statusText: err.statusText, url: err.url || undefined,
        });
        return throwError(() => normalized);   // ← пробрасываем в MessageWrapperService
      })
    );
  }
  return throwError(() => err);
};

  constructor(private msgWrapper: MessageWrapperService) {}

  downloadFile(filename: string) {
    const url = `${this.BASE_URL}/download/${encodeURIComponent(
      filename
    )}`;
    return this.http
      .get(url, {
        responseType: 'blob',
        //observe: 'response', // чтобы достать имя из Content-Disposition
      })
      .pipe(catchError(this.handleError));
  }
}
