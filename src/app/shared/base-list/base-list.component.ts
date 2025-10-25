import {
  Component,
  Injector,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { TableSettingsComponent } from '../table-settings/table-settings.component';
import { TableFilterComponent } from '../table-filter/table-filter.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BlurOnClickDirective } from '../../directives/blur-on-click.directive';
import {
  DefaultAddressParams,
  AddressFilter,
  typedKeys,
} from '../../interfaces/toponym';
import {
  ColumnDefinition,
  GeneralFilter,
  ListComponentType,
  TableParams,
  ViewOption,
} from '../../interfaces/base-list';

import { HasOpDirective } from '../../directives/has-op.directive';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-base-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatIconModule,
    ToastModule,
    MatSidenavModule,
    FormsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    ReactiveFormsModule,
    TableSettingsComponent,
    TableFilterComponent,
    ConfirmDialogModule,
    MatCheckboxModule,
    BlurOnClickDirective,
    HasOpDirective,
    TranslateModule,
  ],
  providers: [],
  templateUrl: './base-list.component.html',
  styleUrl: './base-list.component.css',
})
export class BaseListComponent {
  private route = inject(ActivatedRoute);
  readonly dialog = inject(MatDialog);

  @ViewChild(TableFilterComponent) tableFilterComponent!: TableFilterComponent;

  params = input.required<{
    columns: ColumnDefinition[];
    viewOptions: ViewOption[];
    componentType: ListComponentType;
    tableParams: TableParams;
  }>();

  implicitlyDisplayedColumns!: ColumnDefinition[];
  viewOptions!: ViewOption[];
  componentType!: ListComponentType;

  selectedColumns = output<string[]>();
  addWasClicked = output<void>();

  settingsBadgeValue: number = 0;
  filterBadgeValue: number = 0;

  avoidDoubleRequest = false;

  selectedViewOptionId = signal<string>('only-active');
  notOnlyActual = signal<boolean>(false);
  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  inputValue = '';

  filterValue = signal<GeneralFilter>({
    roles: [],
    comment: [],
    contactTypes: [],
    dateBeginningRange: [],
    dateRestrictionRange: [],
  });

  addressFilterValue = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });

  addressStringValue = signal<string>('');
  strongAddressFilter = signal<boolean>(false);
  strongContactFilter = signal<boolean>(false);

  allFilterParameters = computed(() => {
    //console.log('allFilterParameters');
    // //console.log(this.strongContactFilter());
    //console.log('this.addressFilterValue()');
    //console.log(this.addressFilterValue());
    return {
      viewOption: this.selectedViewOptionId(),
      searchValue: this.searchValue(),
      notOnlyActual: this.notOnlyActual(),
      exactMatch: this.exactMatch(),
      filter: this.filterValue(),
      addressFilter: this.addressFilterValue(),
      strongAddressFilter: this.strongAddressFilter(),
      strongContactFilter: this.strongContactFilter(),
    };
  });

  allFilterParametersChange = output<{
    viewOption: string;
    searchValue: string;
    notOnlyActual: boolean;
    exactMatch: boolean;
    filter: GeneralFilter;
    addressFilter: AddressFilter;
    strongAddressFilter: boolean;
    strongContactFilter: boolean;
  }>();

  filterString = computed(() => {
    // //console.log('filterString computed');
    let filterString = '';
    let viewOption = this.params().viewOptions.find(
      (item) => item.id == this.allFilterParameters().viewOption
    )?.name;
    filterString = filterString + viewOption + ', ';
    filterString =
      filterString +
      (this.allFilterParameters().searchValue
        ? this.allFilterParameters().searchValue + ', '
        : '');
    let filterData: GeneralFilter = this.allFilterParameters().filter;

    for (let key of typedKeys(filterData)) {
      const value = filterData[key];
      if (value.length > 0) {
        if (key === 'dateBeginningRange' || key === 'dateRestrictionRange') {
          const label = key === 'dateBeginningRange' ? 'нач.' : 'блок.';
          filterString +=
            label +
            ': ' +
            this.transformDate((value as Date[])[0]) +
            '-' +
            this.transformDate((value as Date[])[1]) +
            ', ';
        } else {
          for (let item of value) {
            if (key === 'contactTypes') {
              filterString +=
                (item as { type: string; label: string }).label + ', ';
            } else if (key === 'roles') {
              filterString +=
                (item as { id: number; name: string }).name + ', ';
            } else {
              filterString += item + ', ';
            }
          }
        }
      }
    }

    filterString = filterString.slice(0, -2);

    let result = this.addressStringValue()
      ? filterString + ', ' + this.addressStringValue()
      : filterString;
    this.allFilterParametersChange.emit(this.allFilterParameters());
    return result;
  });

  defaultAddressParams!: DefaultAddressParams;

  constructor() {
    this.route.queryParams.subscribe((qp) => {
      this.defaultAddressParams = {
        localityId: qp['localityId'] ? +qp['localityId']! : null,
        districtId: qp['districtId'] ? +qp['districtId']! : null,
        regionId: qp['regionId'] ? +qp['regionId']! : null,
        countryId: qp['countryId'] ? +qp['countryId']! : null,
      };
      this.addressFilterValue.set({
        countries: this.defaultAddressParams.countryId
          ? [this.defaultAddressParams.countryId]
          : [],
        regions: this.defaultAddressParams.regionId
          ? [this.defaultAddressParams.regionId]
          : [],
        districts: this.defaultAddressParams.districtId
          ? [this.defaultAddressParams.districtId]
          : [],
        localities: this.defaultAddressParams.localityId
          ? [this.defaultAddressParams.localityId]
          : [],
      });
      this.addressStringValue.set(qp['addressFilterString']);
    });
  }

  ngOnInit() {
    ////console.log(navigation);
  }

  changeColumnsView(selectedColumns: string[]) {
    this.selectedColumns.emit([...selectedColumns]);
  }

  onAddItemClick() {
    this.addWasClicked.emit();
  }

  changeSettingsBadge(settingsBadgeValue: number) {
    this.settingsBadgeValue = settingsBadgeValue;
  }
  changeFilterBadge(filterBadgeValue: number) {
    this.filterBadgeValue = filterBadgeValue;
    // //console.log(this.filterBadgeValue);
  }

  onChangeViewSelection(option: string) {
    /*     chip.select();
    //console.log(chip.value); */
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.selectedViewOptionId.set(option);
    // this.avoidDoubleRequest = false;
  }

  onSearchEnter(event: Event) {
    let searchString = (event.target as HTMLInputElement).value;
    searchString = searchString.trim().toLowerCase().replaceAll('ё', 'е');
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.searchValue.set(searchString);
    // this.avoidDoubleRequest = false;
  }

  onClearSearchClick() {
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.searchValue.set('');
    this.inputValue = '';
    //this.avoidDoubleRequest = false;
  }

  onClearFilterClick() {
    /*     //console.log('pageData');
          //console.log(pageData);
 */
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.tableFilterComponent.clearForm();
    // this.avoidDoubleRequest = false;
  }

  goToFirstPage() {}

  transformDate(date: Date): string | null {
    return new DatePipe('ru').transform(date, 'dd.MM.yyyy');
  }
}
