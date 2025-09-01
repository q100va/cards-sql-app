import { ErrorHandler, Injectable, inject } from '@angular/core';
import { MessageWrapperService } from './message.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private msgWrapper = inject(MessageWrapperService);
  handleError(error: any): void {
    this.msgWrapper.handle(error, { source: 'GlobalErrorHandler' });
    // можно продублировать в консоль для DEV
    if (!ngDevMode) return;
    console.error(error);
  }
}
