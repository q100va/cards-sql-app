import { ErrorHandler, Injectable, inject } from '@angular/core';
import { MessageWrapperService } from './message.service';
import { ClientLoggerService } from './client-logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly logger = inject(ClientLoggerService);

  handleError(error: unknown): void {
    this.msgWrapper.handle(error, { source: 'GlobalErrorHandler' });
    // The wrapper owns the diagnostic; development console output bypasses capture.
    if (ngDevMode) this.logger.writeErrorToConsole(error);
  }
}
