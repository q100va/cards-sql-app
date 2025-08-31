import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { sanitizeText } from '../utils/sanitize-text';

@Injectable({ providedIn: 'root' })
export class MessageWrapperService {
  constructor(private messageService: MessageService) {}

  /**
   * Adds a secure message by sanitizing the provided detail text.
   * @param severity - The level of message ('info' | 'warn' | 'error' | 'success').
   * @param summary - The title or brief summary of the message.
   * @param detail - The detailed message content that will be sanitized.
   * @param sticky - If true, the message will remain visible until manually dismissed.
   */

  private add(
    severity: 'info' | 'warn' | 'error' | 'success',
    summary: string,
    detail: string,
    sticky: boolean = false
  ) {
    const safeDetail = sanitizeText(detail);
    this.messageService.add({ severity, summary, detail: safeDetail, sticky });
  }

  // Convenience methods for info, warn, error, and success messages.
  public info(detail: string) {
    this.add('info', 'Информация', detail);
  }
  public warn(detail: string) {
    this.add('warn', 'Предупреждение', detail, true);
  }
  public error(detail: string) {
    this.add('error', 'Ошибка', detail, true);
  }
  public success(detail: string) {
    this.add('success', 'Выполнено', detail);
  }


// Determines the appropriate error message to display.
//TODO: разобраться с отображением ошибок - где они хранятся
  public handle(err: any): void {
    console.log(err);
    const errorMessage =
      typeof err.error.message === 'string'
      ? err.error.message: err.message ||  'Произошла ошибка. Обратитесь к администратору.';
    this.error(errorMessage);
  }
}
