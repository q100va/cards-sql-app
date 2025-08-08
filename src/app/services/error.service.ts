import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })

//TODO: не появляется окно с ошибкой
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
/*
    public handle(err: any): void {
      console.error('Error:', err);

      let errorMessage: string;
      if (typeof err.error === 'string') {
        errorMessage = err.error;
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else {
        errorMessage = err.message || 'An unknown error occurred';
      }
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
        life: 5000,
        sticky: true
      });
    } */
}
