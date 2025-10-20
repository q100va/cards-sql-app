import { Component, DestroyRef, ElementRef, inject, input, output, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import readXlsxFile from 'read-excel-file';
import { MessageWrapperService } from '../../services/message.service';
import { AddressService } from '../../services/address.service';
import { ToponymType } from '../../interfaces/toponym';
import { schemas } from './schemas';
import { CustomError } from './custom-error';

@Component({
  selector: 'app-upload-file',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.css',
})
export class UploadFileComponent {
  private readonly destroyRef = inject(DestroyRef);
  private addressService = inject(AddressService);
  private msgWrapper = inject(MessageWrapperService);

  @ViewChild('hiddenfileinput') hiddenfileinput!: ElementRef<HTMLInputElement>;

  file?: File;
  typeOfData = input.required<ToponymType>();
  showSpinner = output<boolean>();
  resetRequested = output<void>();

  // --- utils ---
  private isExcelFile(f: File) {
    const okMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    return /\.xlsx?$/i.test(f.name) || okMime.includes(f.type);
  }

  private normalizeXlsxError(err: unknown): CustomError {
    if (err instanceof CustomError) return err;
    const msg = (err as any)?.message ?? '';
    const knownBad =
      /unsupported/i.test(msg) ||
      /not.*spreadsheet/i.test(msg) ||
      /could not be read/i.test(msg) ||
      /Failed to execute 'readAsArrayBuffer'/i.test(msg) ||
      /invalid/i.test(msg);

    return new CustomError(
      knownBad ? 'ERRORS.FILE.INVALID_FORMAT_XLSX' : 'ERRORS.FILE.NOT_UPLOADED'
    );
  }

  addFile(event: Event) {
    this.showSpinner.emit(true);
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];

    if (!file) {
      this.showSpinner.emit(false);
      return this.msgWrapper.handle(new CustomError('ERRORS.FILE.NOT_CHOSEN'), {
        source: 'UploadFileComponent',
        stage: 'select',
        type: this.typeOfData(),
      });
    }

    if (!this.isExcelFile(file)) {
      this.showSpinner.emit(false);
      return this.msgWrapper.handle(
        new CustomError('ERRORS.FILE.INVALID_FORMAT_XLSX'),
        {
          source: 'UploadFileComponent',
          stage: 'pre-validate',
          type: this.typeOfData(),
        }
      );
    }

    const schema = schemas[this.typeOfData()];

    readXlsxFile(file, { schema })
      .then(({ rows, errors }) => {
        console.log('errors');
        console.log(errors);
        if (!rows?.length) throw new CustomError('ERRORS.FILE.EMPTY');
        if (
          schema &&
          Object.keys(rows[0]).length < Object.keys(schema).length
        ) {
          throw new CustomError('ERRORS.FILE.INVALID_STRUCTURE');
        }
        if (errors.length) {
          throw new CustomError('ERRORS.FILE.VALIDATION', {
            row: errors[0].row,
            column: errors[0].column,
            error: errors[0].error,
          });
        }
        return this.saveData(rows);
      })
      .catch((e) => {
        this.showSpinner.emit(false);
        const err = this.normalizeXlsxError(e);
        this.msgWrapper.handle(err, {
          source: 'UploadFileComponent',
          stage: 'readXlsxFile',
          type: this.typeOfData(),
        });
      })
      .finally(() => {
        this.hiddenfileinput.nativeElement.value = '';
        this.showSpinner.emit(false);
      });
  }

  private saveData(rows: any[]) {
    return this.addressService
      .createListOfToponyms(rows, this.typeOfData())
      .pipe(
        finalize(() => this.showSpinner.emit(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.resetRequested.emit();
        },
        error: (err) => {
          this.msgWrapper.handle(err, {
            source: 'UploadFileComponent',
            stage: 'saveData',
            type: this.typeOfData(),
          });
        },
      });
  }
}
