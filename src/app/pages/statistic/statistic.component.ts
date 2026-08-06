import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { ProgressSpinner } from 'primeng/progressspinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HasOpDirective } from '../../directives/has-op.directive';
import { MessageWrapperService } from '../../services/message.service';
import { ReportsService } from '../../services/reports.service';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatisticRow } from '../../../../shared/schemas/report.schema';

@Component({
  selector: 'app-statistic',
  imports: [
    MatCardModule,
    TranslateModule,
    MatGridListModule,
    ProgressSpinner,
    HasOpDirective,
    TableModule,
  ],
  templateUrl: './statistic.component.html',
  styleUrl: './statistic.component.css',
})
export class StatisticComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly translateService = inject(TranslateService);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly reportsService = inject(ReportsService);

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
    'STATISTIC.TABLE.FOUR_AND_MORE_TIMES'
  ];

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
          console.log('this.report', res.data);
          this.cols = res.data.cols;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ReportsComponent',
            stage: 'getReport',
          }),
      });
  }
}
