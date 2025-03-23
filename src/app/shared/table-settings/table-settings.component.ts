import { Component, input, model, output, signal } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-table-settings',
  imports: [MatTableModule, MatCheckboxModule],
  templateUrl: './table-settings.component.html',
  styleUrl: './table-settings.component.css',
})
export class TableSettingsComponent {
  displayedColumns: string[] = ['select', 'columnName'];
  columnsList = input.required<
    {
      id: number;
      columnName: string;
      columnFullName: string;
      isUnchangeable: boolean;
    }[]
  >();
  selectedColumns = output<string[]>();
  settingsBadgeValue = output<number>();
  dataSource!: MatTableDataSource<{
    id: number;
    columnName: string;
    columnFullName: string;
    isUnchangeable: boolean;
  }>;
  selection!: SelectionModel<{
    id: number;
    columnName: string;
    columnFullName: string;
    isUnchangeable: boolean;
  }>;

  ngOnInit() {
    this.dataSource = new MatTableDataSource<{
      id: number;
      columnName: string;
      columnFullName: string;
      isUnchangeable: boolean;
    }>(this.columnsList());
    this.selection = new SelectionModel<{
      id: number;
      columnName: string;
      columnFullName: string;
      isUnchangeable: boolean;
    }>(true, []);
    this.toggleAllRows();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    //  console.log(this.selection.selected);
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows(...rest: any[]) {
    if(rest.length > 0) {
      console.log(rest[0]);
    }

    if (this.isAllSelected()) {
      this.selection.clear();
      let unchangeableColumns = this.columnsList().filter(item => item.isUnchangeable);
      for (let column of unchangeableColumns) {
        this.selection.select(column);
      }


      this.emitSelectedColumns();
      //this.selectedColumns.emit(this.selection.selected);
      return;
    }
    this.selection.select(...this.dataSource.data);
    // console.log(this.selection);
    this.emitSelectedColumns();
    // this.selectedColumns.emit(this.selection.selected);
  }

  onChange(row: {
    id: number;
    columnName: string;
    columnFullName: string;
    isUnchangeable: boolean;
  }) {
    if (!row.isUnchangeable) {
      this.selection.toggle(row);
      this.emitSelectedColumns();
    }

    // this.selectedColumns.emit(this.selection.selected);
  }

  emitSelectedColumns() {
    let listOfSelectedColumns = this.selection.selected
      .sort((prev, next) => prev.id - next.id)
      .map((item) => item.columnName);
   // console.log(listOfSelectedColumns);
    this.selectedColumns.emit(listOfSelectedColumns);
    this.settingsBadgeValue.emit(listOfSelectedColumns.length - this.columnsList().length);
  }
}
