import {
  Component,
  Injector,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
//import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
//import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { CreateUserDialogComponent } from '../../shared/dialogs/create-user-dialog/create-user-dialog.component';
import { TableSettingsComponent } from '../../shared/table-settings/table-settings.component';
import { TableFilterComponent } from '../../shared/table-filter/table-filter.component';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BlurOnClickDirective } from '../../shared/directives/blur-on-click.directive';
//import { UserColumnsComponent } from '../../shared/user-columns/user-columns.component';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
import { AddressFilter } from '../../interfaces/address-filter';

@Component({
  selector: 'app-list-base',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    //MatListModule,
    MatGridListModule,
    MatIconModule,
    Toast,
    MatSidenavModule,
    FormsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    ReactiveFormsModule,
    //MatMenuModule,
    TableSettingsComponent,
    TableFilterComponent,
    ConfirmDialogModule,
    MatCheckboxModule,
    BlurOnClickDirective,
    //  UserColumnsComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './list-base.component.html',
  styleUrl: './list-base.component.css',
})
export class ListBaseComponent {
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private injector = inject(Injector);
  readonly dialog = inject(MatDialog);

  @ViewChild(TableFilterComponent) tableFilterComponent!: TableFilterComponent;

  implicitlyDisplayedColumns = input.required<
    {
      id: number;
      columnName: string;
      columnFullName: string;
      isUnchangeable: boolean;
    }[]
  >();

  selectedColumns = output<string[]>();

  settingsBadgeValue: number = 0;
  filterBadgeValue: number = 0;

  viewOptions = [
    {
      id: 'all',
      name: 'Все пользователи',
      initiallySelected: false,
    },
    {
      id: 'only-active',
      name: 'Только активные',
      initiallySelected: true,
    },
    {
      id: 'only-blocked',
      name: 'Только заблокированные',
      initiallySelected: false,
    },
  ];

  avoidDoubleRequest = false;

  selectedViewOptionId = signal<string>('only-active');
  notOnlyActual = signal<boolean>(false);
  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  inputValue = '';

  filterValue = signal<{
    [key: string]: string[] | Date[] | null | { [key: string]: string }[];
  }>({
    roles: null,
    comment: null,
    contactTypes: null,
    dateBeginningRange: null,
    dateRestrictionRange: null,
  });

  addressFilterValue = signal<AddressFilter>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });

  addressStringValue = signal<string>('');
  strongAddressFilter = signal<boolean>(false);
  strongContactFilter = signal<boolean>(false);

  allFilterParameters = computed(() => {
    console.log('allFilterParameters');
    // console.log(this.strongContactFilter());
    console.log('this.addressFilterValue()');
    console.log(this.addressFilterValue());
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
    filter: {
      [key: string]:
        | string[]
        | Date[]
        | {
            [key: string]: string;
          }[]
        | null;
    };
    addressFilter: AddressFilter;
    strongAddressFilter: boolean;
    strongContactFilter: boolean;
  }>();

  filterString = computed(() => {
    // console.log('filterString computed');
    let filterString = '';
    let viewOption = this.viewOptions.find(
      // (item) => item.id == this.selectedViewOptionId()
      (item) => item.id == this.allFilterParameters().viewOption
    )?.name;
    filterString = filterString + viewOption + ', ';
    filterString =
      filterString +
      (this.allFilterParameters().searchValue
        ? this.allFilterParameters().searchValue + ', '
        : '');
    let filterData = this.allFilterParameters().filter;
    for (let key of this.objectKeys(filterData)) {
      if (filterData[key] && filterData[key]!.length > 0) {
        if (key == 'dateBeginningRange') {
          filterString =
            filterString +
            'нач.: ' +
            this.transformDate(filterData[key]![0] as Date) +
            '-' +
            this.transformDate(filterData[key]![1] as Date) +
            ', ';
        } else if (key == 'dateRestrictionRange') {
          filterString =
            filterString +
            'блок.: ' +
            this.transformDate(filterData[key]![0] as Date) +
            '-' +
            this.transformDate(filterData[key]![1] as Date) +
            ', ';
        } else {
          for (let item of filterData[key]!) {
            if (key == 'contactTypes') {
              console.log('item');
              console.log(item);
              let contactType = item as {
                [key: string]: string;
              };
              filterString = filterString + contactType['label'] + ', ';
            } else filterString = filterString + item + ', ';
          }
        }
      }
    }
    filterString = filterString.slice(0, -2);

    let result = this.addressStringValue()
      ? filterString + ', ' + this.addressStringValue()
      : filterString;
    //this.getUsers();
    this.allFilterParametersChange.emit(this.allFilterParameters());
    return result;
  });

  defaultAddressParams: DefaultAddressParams = {
    localityId: null,
    districtId: null,
    regionId: null,
    countryId: null,
  };

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.defaultAddressParams.localityId = params['localityId'];
      this.defaultAddressParams.districtId = params['districtId'];
      this.defaultAddressParams.regionId = params['regionId'];
      this.defaultAddressParams.countryId = params['countryId'];
    });
    console.log('this.defaultAddressParams in user-list');
    console.log(this.defaultAddressParams);

    /*     effect(() => {
      this.allFilterParametersChange.emit(this.allFilterParameters());
    }); */
  }

  ngOnInit() {
    //console.log(navigation);
  }
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  changeColumnsView(selectedColumns: string[]) {
    this.selectedColumns.emit([...selectedColumns]);
  }

  onAddUserClick() {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, {
      disableClose: true,
      minWidth: '800px',
      height: '80%',
      autoFocus: 'dialog',
      restoreFocus: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      //console.log('The dialog was closed');
      if (result.userName) {
        this.getUsers();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${result.userName} успешно создан!`,
        });
      }
    });
  }

  changeSettingsBadge(settingsBadgeValue: number) {
    this.settingsBadgeValue = settingsBadgeValue;
  }
  changeFilterBadge(filterBadgeValue: number) {
    this.filterBadgeValue = filterBadgeValue;
    // console.log(this.filterBadgeValue);
  }

  onChangeViewSelection(option: string) {
    /*     chip.select();
    console.log(chip.value); */
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.selectedViewOptionId.set(option);
    // this.avoidDoubleRequest = false;
    // this.getUsers();
  }

  searchUser(event: Event) {
    let searchString = (event.target as HTMLInputElement).value;
    searchString = searchString.trim().toLowerCase().replaceAll('ё', 'е');
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.searchValue.set(searchString);
    // this.avoidDoubleRequest = false;
    //this.getUsers();
  }

  onClearSearchClick() {
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.searchValue.set('');
    this.inputValue = '';
    //this.avoidDoubleRequest = false;
    //this.getUsers();
  }

  onClearFilterClick() {
    /*     console.log('pageData');
          console.log(pageData);
 */
    this.avoidDoubleRequest = true;
    this.goToFirstPage();
    this.tableFilterComponent.clearForm();
    // this.avoidDoubleRequest = false;
    //this.getUsers();
  }

  goToFirstPage() {}

  getUsers() {
    //this.usersListComponent.getUsers(this.allFilterParameters());
  }

  transformDate(date: Date | string): string | null {
    return new DatePipe('ru').transform(date, 'dd.MM.yyyy');
  }
}
