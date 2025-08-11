import { Component, inject, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import readXlsxFile from 'read-excel-file';
import { schemas } from './schemas';
import { FileService } from '../../services/file.service';
import { MatIconModule } from '@angular/material/icon';
import { ToponymType } from '../../interfaces/types';
import { MessageWrapperService } from '../../services/message.service';

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
  msgWrapper  = inject(MessageWrapperService);
  file?: File;
  errorMessage?: string;
  typeOfData = input.required<ToponymType>();
  showSpinner = output<boolean>();

  addFile(event: Event) {
    //console.log('START', event);
    this.showSpinner.emit(true);
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files) {
      this.file = inputElement.files[0];
      //console.log('this.file');
      //console.log(this.file);
      let schema = schemas[this.typeOfData()];
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
          //console.log('rows');
          //console.log(rows);
          //console.log('errors');
          //console.log(errors);
          this.saveData(rows);
        })
        .catch((err) => {
          this.showSpinner.emit(false);
          this.msgWrapper.handle({error: 'Невозможно загрузить выбранный файл: ' + err});
          //this.errorHandling({error: 'Невозможно загрузить выбранный файл: ' + err});
        });
    } else {
      this.showSpinner.emit(false);
      this.msgWrapper.handle({error: 'Невозможно загрузить выбранный файл!'});
      //this.errorHandling({error: 'Невозможно загрузить выбранный файл!'});
    }
  }

  saveData(rows: any) {
    this.fileService
      .createListOfAddressElement(rows, this.typeOfData())
      .subscribe({
        next: (res) => {
          this.msgWrapper.success(res.msg);
          this.showSpinner.emit(false);
          location.reload();//TODO: delete?
        },
        error: (err) => {
          this.showSpinner.emit(false);
          this.msgWrapper.handle(err)
        },
      });
  }


}
