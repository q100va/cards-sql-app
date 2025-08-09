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
  add(
    severity: 'info' | 'warn' | 'error' | 'success',
    summary: string,
    detail: string,
    sticky: boolean = false
  ) {
    const safeDetail = sanitizeText(detail);
    //const safeDetail = this.sanitizer.sanitize(SecurityContext.HTML, detail) || '';
    this.messageService.add({ severity, summary, detail: safeDetail, sticky });
  }

  // Convenience methods for info, warn, error, and success messages.
  info(detail: string) {
    this.add('info', 'Информация', detail);
  }
  warn(detail: string) {
    this.add('warn', 'Предупреждение', detail, true);
  }
  error(detail: string) {
    this.add('error', 'Ошибка', detail, true);
  }
  success(detail: string) {
    this.add('success', 'Успех', detail);
  }
}
