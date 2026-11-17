import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  ViewChild,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import readXlsxFile from 'read-excel-file';
import { MessageWrapperService } from '../../services/message.service';
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
  private fileSelectionVersion = 0;
  private ownerDestroyed = false;
  private msgWrapper = inject(MessageWrapperService);

  @ViewChild('hiddenfileinput') hiddenfileinput!: ElementRef<HTMLInputElement>;

  fileName = '';
  typeOfData = input.required<ToponymType | 'seniors'>();
  isCompleted = input<boolean>();

  showSpinner = output<boolean>();
  result = output<any[]>();

  constructor() {
    this.destroyRef.onDestroy(() => { this.ownerDestroyed = true; });
    effect(() => {
      if (this.isCompleted()) this.fileName = '';
    });
  }

  // --- utils ---
  // File reads may finish late; only the current live selection owns UI side effects.
  private ownsSelection(version: number): boolean {
    return !this.ownerDestroyed && version === this.fileSelectionVersion;
  }

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
      knownBad ? 'ERRORS.FILE.INVALID_FORMAT_XLSX' : 'ERRORS.FILE.NOT_UPLOADED',
    );
  }

  addFile(event: Event) {
    if (this.ownerDestroyed) return;
    const version = ++this.fileSelectionVersion;
    this.showSpinner.emit(true);
    this.fileName = '';
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
        },
      );
    }
    this.fileName = file.name;

    const schema = schemas[this.typeOfData()];

    readXlsxFile(file, { schema })
      .then(({ rows, errors }) => {
        if (!this.ownsSelection(version)) return;
        if (!rows?.length) throw new CustomError('ERRORS.FILE.EMPTY');
        if (errors.length) {
          throw new CustomError('ERRORS.FILE.VALIDATION', {
            row: errors[0].row,
            column: errors[0].column,
            error: errors[0].error,
          });
        }
        this.result.emit(rows);
      })
      .catch((e) => {
        if (!this.ownsSelection(version)) return;
        const err = this.normalizeXlsxError(e);
        this.msgWrapper.handle(err, {
          source: 'UploadFileComponent',
          stage: 'readXlsxFile',
          type: this.typeOfData(),
        });
      })
      .finally(() => {
        if (!this.ownsSelection(version)) return;
        this.showSpinner.emit(false);
        this.hiddenfileinput.nativeElement.value = '';
      });
  }

  clear() {
    this.fileName = '';
  }

}
