import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  constructor(private messageService: MessageService) {}

  public handle(err: any): void {
    console.log(err);
    const errorMessage =
      typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;

    this.messageService.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: errorMessage,
      sticky: true,
    });
  }
}
