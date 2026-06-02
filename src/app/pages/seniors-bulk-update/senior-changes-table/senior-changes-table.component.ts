import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { DateUtilsService } from '../../../services/date-utils.service';
import {
  SeniorDiff,
  SeniorRaw,
} from '../../../../../shared/schemas/senior.schema';

@Component({
  selector: 'app-senior-changes-table',
  standalone: true,
  imports: [
    TableModule,
    MatButtonModule,
    MatRadioModule,
    TranslateModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './senior-changes-table.component.html',
})
export class SeniorChangesTableComponent {
  readonly translateService = inject(TranslateService);
  seniors = input.required<SeniorDiff[]>();
  moveToAdmitted = output<number>();

  acceptChanges = output<{
    seniorId: number;
    rowIndex: number;
    accepted: Record<string, unknown>;
  }>();

  /*   valueSelected = output<{
    seniorId: number;
    field: string;
    value: unknown;
  }>(); */
  accepted: Record<number, Record<string, unknown>> = {};

  readonly dateUtils = inject(DateUtilsService);

  fullName(senior: SeniorRaw): string {
    return [senior.lastName, senior.firstName, senior.patronymic]
      .filter(Boolean)
      .join(' ');
  }

  onValueSelected(seniorId: number, field: string, value: unknown): void {
    if (!this.accepted[seniorId]) {
      this.accepted[seniorId] = {};
    }

    this.accepted[seniorId][field] = value;

    console.log(this.accepted);
    //this.valueSelected.emit({ seniorId, field, value });
  }

  getObjectSize(seniorId: number) {
    return Object.keys(this.accepted[seniorId] ?? {}).length;
  }
}
