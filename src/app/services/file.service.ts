import { Injectable, inject } from '@angular/core';
import { catchError, from, mergeMap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Row, Workbook } from 'exceljs';
import { TranslateService } from '@ngx-translate/core';

export interface ExcelColumn {
  field: string;
  header: string;
  width?: number;
}

export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
}

type ExcelRowType = 'period' | 'occasion';

type ExcelExportRow = object & {
  rowType?: ExcelRowType;
};

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/files`;
  private readonly translateService = inject(TranslateService);

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (err: HttpErrorResponse) => {
    if (err.error instanceof Blob) {
      return from(err.error.text()).pipe(
        mergeMap((text) => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch {}
          const normalized = new HttpErrorResponse({
            error: parsed ?? { message: text },
            headers: err.headers,
            status: err.status,
            statusText: err.statusText,
            url: err.url || undefined,
          });
          return throwError(() => normalized);
        }),
      );
    }
    return throwError(() => err);
  };

  downloadFile(filename: string) {
    const url = `${this.BASE_URL}/download/${encodeURIComponent(filename)}`;
    return this.http
      .get(url, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  getOccasionName(occasion: string) {
    return String(occasion ?? '')
      .split(' ')
      .filter(Boolean)
      .map((part) =>
        /^\d+$/.test(part) ? part : this.translateService.instant(part),
      )
      .join(' ');
  }

  async export(
    data: readonly ExcelExportRow[],
    columns: ExcelColumn[],
    options: ExcelExportOptions = {},
  ): Promise<void> {
    if (!data.length || !columns.length) {
      return;
    }

    const workbook = new Workbook();

    workbook.creator = 'Cards SQL App';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(
      this.normalizeSheetName(options.sheetName ?? 'Report'),
    );

    // Add table header.
    worksheet.addRow(columns.map((column) => column.header));

    const rowsWithTypes: {
      row: Row;
      rowType?: 'period' | 'occasion';
    }[] = [];

    // Add report rows.
    for (const item of data) {
      const row = worksheet.addRow(
        columns.map((column) =>
          this.normalizeCellValue(this.getNestedValue(item, column.field)),
        ),
      );
      rowsWithTypes.push({
        row,
        rowType: item.rowType,
      });
      /*
      if (item.rowType === 'period') {
        row.font = {
          bold: true,
        };
      }

      if (item.rowType === 'occasion') {
        const occasionNameCell = row.getCell(1);

        occasionNameCell.alignment = {
          horizontal: 'left',
          indent: 2,
        };
      } */
    }

    // First apply common styles.
    this.applyWorksheetStyles(worksheet, columns);

    // Then apply row-specific styles.
    for (const { row, rowType } of rowsWithTypes) {
      if (rowType === 'period') {
        row.font = {
          bold: true,
        };
      }

      if (rowType === 'occasion') {
        const cell = row.getCell(1);

        cell.alignment = {
          ...cell.alignment,
          horizontal: 'left',
          indent: 2,
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    this.downloadBlob(
      blob,
      this.normalizeFileName(options.fileName ?? 'report.xlsx'),
    );
  }

  private getNestedValue(object: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
      if (value === null || value === undefined || typeof value !== 'object') {
        return undefined;
      }

      return (value as Record<string, unknown>)[key];
    }, object);
  }

  private normalizeCellValue(value: unknown): string | number | boolean | Date {
    if (value === null || value === undefined) {
      return '';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === 'object' ? JSON.stringify(item) : String(item),
        )
        .join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private applyWorksheetStyles(
    worksheet: ReturnType<Workbook['addWorksheet']>,
    columns: ExcelColumn[],
  ): void {
    const headerRow = worksheet.getRow(1);

    headerRow.font = {
      bold: true,
    };

    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    headerRow.height = 30;

    /*  worksheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    worksheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },
      to: {
        row: 1,
        column: columns.length,
      },
    }; */

    columns.forEach((column, index) => {
      const worksheetColumn = worksheet.getColumn(index + 1);

      worksheetColumn.width =
        column.width ?? this.calculateColumnWidth(worksheetColumn.values);

      worksheetColumn.alignment = {
        vertical: 'top',
        wrapText: true,
      };
    });
  }

  private calculateColumnWidth(values: readonly unknown[]): number {
    const maxLength = values.reduce<number>((maximum, value) => {
      const length =
        value === null || value === undefined ? 0 : String(value).length;

      return Math.max(maximum, length);
    }, 0);

    return Math.min(Math.max(maxLength + 2, 12), 40);
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private normalizeFileName(fileName: string): string {
    const sanitizedName = fileName.replace(/[<>:"/\\|?*]/g, '_');

    return sanitizedName.toLowerCase().endsWith('.xlsx')
      ? sanitizedName
      : `${sanitizedName}.xlsx`;
  }

  private normalizeSheetName(sheetName: string): string {
    return sheetName.replace(/[\\/*?:[\]]/g, '_').slice(0, 31) || 'Report';
  }
}
