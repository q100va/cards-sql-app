import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HasOpDirective } from '../../directives/has-op.directive';
import { MessageWrapperService } from '../../services/message.service';
import { ReportsService } from '../../services/reports.service';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatisticRow } from '../../../../shared/schemas/report.schema';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-statistic',
  imports: [
    MatCardModule,
    TranslateModule,
    MatGridListModule,
    ProgressSpinner,
    HasOpDirective,
    TableModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './statistic.component.html',
  styleUrl: './statistic.component.css',
})
export class StatisticComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly translateService = inject(TranslateService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly reportsService = inject(ReportsService);
  private readonly fileService = inject(FileService);

  isExporting = false;

  generalStatistic: StatisticRow[] = [];
  showSpinner = signal(true);

  cols!: {
    field: string;
    header: string;
  }[];

  headers = [
    'STATISTIC.TABLE.ALL',
    'STATISTIC.TABLE.ZERO',
    'STATISTIC.TABLE.ONCE',
    'STATISTIC.TABLE.TWICE',
    'STATISTIC.TABLE.THREE_TIMES',
    'STATISTIC.TABLE.FOUR_AND_MORE_TIMES',
  ];

  //TODO: Add statistic for each 5 days of month for HB.

  ngOnInit() {
    this.reportsService
      .getStatistic()
      .pipe(
        finalize(() => this.showSpinner.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.generalStatistic = res.data.report;
          this.cols = res.data.cols;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'StatisticComponent',
            stage: 'getStatistic',
          }),
      });
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

  async exportToExcel(): Promise<void> {
    if (
      !this.generalStatistic.length ||
      this.isExporting
    ) {
      return;
    }

    this.isExporting = true;
    const data = this.generalStatistic.map((i) => ({
      occasionName: this.getOccasionName(i.occasionName),
      allRecipients: i.allRecipients,
      partRecipients: i.partRecipients,
      zeroAll: i.zeroAll,
      zeroPart: i.zeroPart,
      onceAll: i.onceAll,
      oncePart: i.oncePart,
      twiceAll: i.twiceAll,
      twicePart: i.twicePart,
      threeTimesAll: i.threeTimesAll,
      threeTimesPart: i.threeTimesPart,
      fourTimesOrMoreAll: i.fourTimesOrMoreAll,
      fourTimesOrMorePart: i.fourTimesOrMorePart,
    }));
    const exportColumnsDraft = [
      { field: 'occasionName', header: 'STATISTIC.EXPORT.OCCASION', width:30 },
      { field: 'allRecipients', header: 'STATISTIC.EXPORT.ALL' },
      {
        field: 'partRecipients',
        header: 'STATISTIC.EXPORT.INCL_PART',
      },
      {
        field: 'zeroAll',
        header: 'STATISTIC.EXPORT.ZERO',
      },
      {
        field: 'zeroPart',
        header: 'STATISTIC.EXPORT.INCL_PART',
      },
      {
        field: 'onceAll',
        header: 'STATISTIC.EXPORT.ONCE',
      },
      {
        field: 'oncePart',
        header: 'STATISTIC.EXPORT.INCL_PART',
      },
      {
        field: 'twiceAll',
        header: 'STATISTIC.EXPORT.TWICE',
      },
      {
        field: 'twicePart',
        header: 'STATISTIC.EXPORT.INCL_PART',
      },
      {
        field: 'threeTimesAll',
        header: 'STATISTIC.EXPORT.THREE_TIMES',
      },
      {
        field: 'threeTimesPart',
        header: 'STATISTIC.EXPORT.INCL_PART',
      },
      {
        field: 'fourTimesOrMoreAll',
        header: 'STATISTIC.EXPORT.FOUR_AND_MORE_TIMES',
      },
      {
        field: 'fourTimesOrMorePart',
        header: 'STATISTIC.EXPORT.INCL_PART',
      },
    ];

    const exportColumns = exportColumnsDraft.map((i) => ({
      field: i.field,
      header: this.translateService.instant(i.header),
      width: i.width ?? 18
    }));

    try {
      await this.fileService.export(data, exportColumns, {
        fileName: `statistic-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Statistic',
      });
    } finally {
      this.isExporting = false;
    }
  }
}
