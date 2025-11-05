//src\app\shared\table-settings\table-settings.component.ts
import { Component, input, output } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ColumnDefinition } from '../../interfaces/base-list';
import { TranslateModule } from '@ngx-translate/core';

type Row = ColumnDefinition;

@Component({
  selector: 'app-table-settings',
  imports: [MatTableModule, MatCheckboxModule, TranslateModule],
  templateUrl: './table-settings.component.html',
  styleUrl: './table-settings.component.css',
})
export class TableSettingsComponent {
  columnsList = input.required<Row[]>();
  selectedColumns = output<string[]>();
  settingsBadgeValue = output<number>();

  readonly displayedColumns = ['select', 'columnName'] as const;

  dataSource!: MatTableDataSource<Row>;
  selection = new SelectionModel<Row>(true, []);

  ngOnInit(): void {
    const data = this.columnsList();
    this.dataSource = new MatTableDataSource<Row>(data);
    this.selection = new SelectionModel<Row>(true, []);

    // Select all at start
    this.selection.select(...data);

    // Emit initial state
    this.emitSelectedColumns();
  }

  /** Selected count equals total count */
  isAllSelected(): boolean {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  /** Toggle all; always keep unchangeable rows selected */
  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      this.selectUnchangeable();
    } else {
      this.selection.select(...this.dataSource.data);
    }
    this.emitSelectedColumns();
  }

  /** Toggle single row if it’s allowed */
  onChange(row: Row): void {
    if (row.isUnchangeable) return;
    this.selection.toggle(row);
    this.emitSelectedColumns();
  }

  private selectUnchangeable(): void {
    for (const row of this.dataSource.data) {
      if (row.isUnchangeable) this.selection.select(row);
    }
  }

  /** Emit selected column names in original order + badge count (kept as-is) */
  private emitSelectedColumns(): void {
    const selected = [...this.selection.selected]
      .sort((a, b) => a.id - b.id)
      .map((r) => r.columnName);

    this.selectedColumns.emit(selected);

    // Preserve existing business rule: selectedCount - totalCount
    this.settingsBadgeValue.emit(
      selected.length - this.columnsList().length
    );
  }
}
