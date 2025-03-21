import { Component, inject, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import readXlsxFile from 'read-excel-file';
import { schemas } from './schemas';
import { FileService } from '../../services/file.service';
import { MatIconModule } from '@angular/material/icon';

import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-upload-file',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,

  ],
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.css',
})
export class UploadFileComponent {
  private fileService = inject(FileService);
  private messageService = inject(MessageService);
  file?: File;
  errorMessage?: string;
  typeOfData = input.required<'country' | 'region' | 'district' | 'locality'>();
 // afterUploadingFile = output<void>();

  addFile(event: Event) {
    console.log('START', event);
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      this.file = inputElement.files[0];
      console.log('this.file');
      console.log(this.file);
      let schema = schemas[this.typeOfData() as keyof typeof schemas];
      readXlsxFile(this.file, { schema })
        .then(({ rows, errors }) => {
          if (rows.length == 0) {
            throw new Error(
              'Файл пустой или отсутствуют обязательные колонки!'
            );
          }
          if (rows.length < Object.keys(schema).length) {
            throw new Error('В файле отсутствуют обязательные колонки!');
          }
          console.log('rows');
          console.log(rows);
          console.log('errors');
          console.log(errors);
          this.saveData(rows);
        })
        .catch((err) => {
          this.errorHandling({error: 'Невозможно загрузить выбранный файл: ' + err});
         // this.errorMessage = 'Невозможно загрузить выбранный файл: ' + err;
        });
    } else {
      this.errorHandling({error: 'Невозможно загрузить выбранный файл!'});
    }
  }

  saveData(rows: any) {
    this.fileService
      .createListOfAddressElement(rows, this.typeOfData())
      .subscribe({
        next: (res) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Подтверждение',
            detail: res.msg,
            sticky: false,
          });
          //this.afterUploadingFile.emit();
          location.reload();

        },
        error: (err) => {
          this.errorHandling(err);
        },
      });
  }

  errorHandling(err: any) {
    console.log(err);
    let errorMessage =
      typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
    this.messageService.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: errorMessage,
      sticky: true,
    });
  }
}
