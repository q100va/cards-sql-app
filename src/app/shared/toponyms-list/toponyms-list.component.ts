import {
  Component,
  ViewChild,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProgressSpinner } from 'primeng/progressspinner';

import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { saveAs } from 'file-saver';
import { BlurOnClickDirective } from '../../shared/directives/blur-on-click.directive';

import { MatSelectModule } from '@angular/material/select';
import { AddressService } from '../../services/address.service';
import { AddressFilterComponent } from '../address-filter/address-filter.component';

import { FileService } from '../../services/file.service';
import { UploadFileComponent } from '../upload-file/upload-file.component';
import { Router } from '@angular/router';
import { ToponymDetailsDialogComponent } from '../dialogs/toponym-details-dialog/toponym-details-dialog.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { AddressFilterParams } from '../../interfaces/address-filter-params';
import { GeographyLevels, Ways } from '../../interfaces/types';
import { DefaultAddressParams } from '../../interfaces/default-address-params';

@Component({
  selector: 'app-toponyms-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTableModule,
    MatSortModule,
    MatGridListModule,
    MatPaginatorModule,
    MatIconModule,
    Toast,
    FormsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    ReactiveFormsModule,
    MatMenuModule,
    ConfirmDialogModule,
    MatCheckboxModule,
    MatSelectModule,
    AddressFilterComponent,
    UploadFileComponent,
    ProgressSpinner,
    BlurOnClickDirective,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './toponyms-list.component.html',
  styleUrl: './toponyms-list.component.css',
})
export class ToponymsListComponent {
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private addressService = inject(AddressService);
  readonly dialog = inject(MatDialog);
  private fileService = inject(FileService);
  dataSource!: MatTableDataSource<{
    id: number;
    name: string;
    shortName?: string;
    postName?: string;
    shortPostName?: string;
    districtId?: number;
    regionId?: number;
    countryId?: number;
  }>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  length = signal<number>(0);
  currentPage = 1;
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50, 100];
  avoidDoubleRequest = false;
  showSpinner = signal<boolean>(false);
  toponymProps = input.required<ToponymProps>();
  type = model.required<GeographyLevels>();

  ways: Ways = {
    locality: {
      district: 'district.name',
      region: 'district.region.name',
      country: 'district.region.country.name',
    },
    district: {
      district: null,
      region: 'region.name',
      country: 'region.country.name',
    },
    region: {
      district: null,
      region: null,
      country: 'country.name',
    },
    country: {
      district: null,
      region: null,
      country: null,
    },
  };

  ids: Ways = {
    locality: {
      locality: 'id',
      district: 'district.id',
      region: 'district.region.id',
      country: 'district.region.country.id',
    },
    district: {
      locality: null,
      district: 'id',
      region: 'region.id',
      country: 'region.country.id',
    },
    region: {
      locality: null,
      district: null,
      region: 'id',
      country: 'country.id',
    },
    country: {
      locality: null,
      district: null,
      region: null,
      country: 'id',
    },
  };

  params!: AddressFilterParams;

  defaultAddressParams!: DefaultAddressParams;

  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  sortParameters = signal<{
    active: string;
    direction: 'asc' | 'desc' | '';
  }>({
    active: '',
    direction: '',
  });

  addressString = signal<string>('');
  addressFilter = signal<{
    countries: null | number[] | [];
    regions: null | number[] | [];
    districts: null | number[] | [];
    localities: null | number[] | [];
  }>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });

  filterValue = computed(() => {
    //console.log('filterValue computed');
    return {
      searchValue: this.searchValue(),
      exactMatch: this.exactMatch(),
      addressString: this.addressString(),
      addressFilter: this.addressFilter(),
      sortParameters: this.sortParameters(),
    };
  });

  filterString = computed(() => {
    //console.log('filterString computed');
    let filterString = '';
    filterString =
      filterString +
      (this.filterValue().searchValue
        ? this.filterValue().searchValue + ', '
        : '');
    //console.log('filterString');
    //console.log(filterString);

    filterString = filterString.slice(0, -2);

    let addressString = this.addressString();
    //console.log('addressString main');
    //console.log(addressString);

    let result = '';
    if (addressString) {
      result = filterString
        ? filterString + ', ' + addressString
        : addressString;
    } else {
      result = filterString ? filterString : '';
    }
    this.getToponyms();
    return result;
  });

  toponyms?: {
    id: number;
    name: string;
    shortName?: string;
    postName?: string;
    shortPostName?: string;
    districtId?: number;
    regionId?: number;
    countryId?: number;
  }[];

  constructor() {}

  ngOnInit() {
    this.params = {
      source: 'toponymList',
      multiple: false,
      cols: '4',
      gutterSize: '16px',
      rowHeight: '76px',
      isShowCountry: this.toponymProps().isShowCountry,
      isShowRegion: this.toponymProps().isShowRegion,
      isShowDistrict: this.toponymProps().isShowDistrict,
      isShowLocality: this.toponymProps().isShowLocality,
      class: 'none',
    };

    this.defaultAddressParams = {
      localityId: this.toponymProps().defaultLocalityId,
      districtId: this.toponymProps().defaultDistrictId,
      regionId: this.toponymProps().defaultRegionId,
      countryId: this.toponymProps().defaultCountryId,
    };
  }
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
  sortData(sort: Sort) {
    this.sortParameters.set(sort);
  }
  onAddToponymClick() {
    const dialogRefCreate = this.dialog.open(ToponymDetailsDialogComponent, {
      data: {
        type: this.type(),
        operation: 'create',
        defaultAddressParams: {
          localityId: null,
          districtId: null,
          regionId: null,
          countryId: null,
        },
        isShowCountry: this.toponymProps().isShowCountry,
        isShowRegion: this.toponymProps().isShowRegion,
        isShowDistrict: this.toponymProps().isShowDistrict,
        isShowLocality: this.toponymProps().isShowLocality,
        specialField:
          'isShow' + this.type()[0].toUpperCase() + this.type().substring(1),
        creationTitle: this.toponymProps().creationTitle,
        viewTitle: this.toponymProps().viewTitle,
        namePlaceHolder: this.toponymProps().namePlaceHolder,
        shortNamePlaceHolder: this.toponymProps().shortNamePlaceHolder,
        postNamePlaceHolder: this.toponymProps().postNamePlaceHolder,
        shortPostNamePlaceHolder: this.toponymProps().shortPostNamePlaceHolder,
      },
      disableClose: true,
      minWidth: '500px',
      height: 'fit-content',
      autoFocus: 'dialog',
      restoreFocus: true,
      //height: '80%',
    });
    dialogRefCreate.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
      if (result.toponymName) {
        this.getToponyms();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Топоним '${result.toponymName}' успешно создан!`,
        });
      }
    });
  }

  searchToponym(event: Event) {
    let searchString = (event.target as HTMLInputElement).value;
    searchString = searchString.trim().toLowerCase().replaceAll('ё', 'е');
    this.goToFirstPage();
    this.searchValue.set(searchString);
    console.log('searchToponym');
  }
  onClearSearchClick() {
    this.goToFirstPage();
    this.searchValue.set('');
    console.log('onClearSearchClick');
  }

  onFileDownloadClick() {
    this.fileService.downloadFile(this.toponymProps().filename!).subscribe({
      next: (blob) => {
        saveAs(blob, this.toponymProps().filename);
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string'
            ? err.error
            : 'Невозможно скачать файл: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }
//TODO:
  onOpenHomesListClick(toponym: any) {}

  onOpenUsersListClick(toponym: any) {
    console.log('toponym');
    console.log(toponym);
    this.router.navigate(['/users'], {
      queryParams: {
        localityId: this.ids[this.type()].locality
          ? toponym[this.ids[this.type()].locality!]
          : null,
        districtId: this.ids[this.type()].district
          ? toponym[this.ids[this.type()].district!]
          : null,
        regionId: this.ids[this.type()].region
          ? toponym[this.ids[this.type()].region!]
          : null,
        countryId: this.ids[this.type()].country
          ? toponym[this.ids[this.type()].country!]
          : null,
      },
    });
  }
  //TODO:
  onOpenClientsListClick(toponym: any) {}
  onOpenSeniorsListClick(toponym: any) {}

  onOpenLocalitiesListClick(toponym: any) {
    this.router.navigate(['/localities'], {
      queryParams: {
        countryId: this.ids[this.type()].country
          ? toponym[this.ids[this.type()].country!]
          : null,
        regionId: this.ids[this.type()].region
          ? toponym[this.ids[this.type()].region!]
          : null,
        districtId: this.ids[this.type()].district
          ? toponym[this.ids[this.type()].district!]
          : null,
      },
    });
  }
  onOpenDistrictsListClick(toponym: any) {
    this.router.navigate(['/districts'], {
      queryParams: {
        countryId: this.ids[this.type()].country
          ? toponym[this.ids[this.type()].country!]
          : null,
        regionId: this.ids[this.type()].region
          ? toponym[this.ids[this.type()].region!]
          : null,
      },
    });
  }
  onOpenRegionsListClick(toponym: any) {
    this.router.navigate(['/regions'], {
      queryParams: {
        countryId: this.ids[this.type()].country
          ? toponym[this.ids[this.type()].country!]
          : null,
      },
    });
  }

  onOpenToponymCardClick(toponym: any) {
    const dialogRefCreate = this.dialog.open(ToponymDetailsDialogComponent, {
      data: {
        type: this.type(),
        operation: 'view-edit',
        defaultAddressParams: {
          localityId: this.ids[this.type()].locality
            ? toponym[this.ids[this.type()].locality!]
            : null,
          districtId: this.ids[this.type()].district
            ? toponym[this.ids[this.type()].district!]
            : null,
          regionId: this.ids[this.type()].region
            ? toponym[this.ids[this.type()].region!]
            : null,
          countryId: this.ids[this.type()].country
            ? toponym[this.ids[this.type()].country!]
            : null,
        },
        toponym: toponym,
        isShowCountry: this.toponymProps().isShowCountry,
        isShowRegion: this.toponymProps().isShowRegion,
        isShowDistrict: this.toponymProps().isShowDistrict,
        isShowLocality: this.toponymProps().isShowLocality,
        specialField:
          'isShow' + this.type()[0].toUpperCase() + this.type().substring(1),
        creationTitle: this.toponymProps().creationTitle,
        viewTitle: this.toponymProps().viewTitle,
      },
      disableClose: true,
      minWidth: '500px',
      height: 'fit-content',
      autoFocus: 'dialog',
      restoreFocus: true,
      //height: '80%',
    });
    dialogRefCreate.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
      this.getToponyms();
      if (result.toponymName) {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Топоним '${result.toponymName}' успешно обновлен!`,
        });
      }
    });
  }

  onDeleteToponymClick(rowId: number, rowShortName: string, destroy: boolean) {
    this.confirmationService.confirm({
      message: `Вы уверены, что хотите удалить топоним ${rowShortName}?<br />Данные невозможно будет восстановить!`,
      header: 'Предупреждение',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Нет',
      },
      acceptButtonProps: {
        label: 'Да',
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.checkPossibilityToDeleteToponym(rowId, rowShortName, destroy);
      },
      reject: () => {},
    });
  }

  checkPossibilityToDeleteToponym(
    id: number,
    deletingToponym: string,
    destroy: boolean
  ) {
    this.addressService
      .checkPossibilityToDeleteToponym(this.type(), id, destroy)
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.deleteToponym(id, destroy, deletingToponym);
          } else {
            //TODO: проверить на неактуальных адресах
            const detail = destroy
              ? `Топоним '${deletingToponym}' невозможно удалить!\nОн является составляющей адресов или имеет подчиненные топонимы.\nПроверьте список связанных с ним топонимов, интернатов, поздравляющих и пользователей.\nЭти адреса, в т.ч. неактуальные, и топонимы должны быть изменены или удалены.`
              : `Топоним '${deletingToponym}' невозможно удалить!\nОн является составляющей актуальных адресов или имеет подчиненные топонимы.\nПроверьте список связанных с ним топонимов, интернатов, поздравляющих и пользователей.\nЭти адреса и топонимы должны быть изменены, удалены или помечены как неактуальные.`;
            this.messageService.add({
              severity: 'warn',
              summary: 'Ошибка',
              detail: detail,
              sticky: true,
            });
          }
        },
        error: (err) => {
          this.errorHandling(err);
        },
      });
  }

  deleteToponym(id: number, destroy: boolean, deletingToponym: string) {
    const serviceFuncName = destroy ? 'deleteToponym' : 'blockToponym';
    this.addressService[serviceFuncName](this.type(), id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Топоним ${deletingToponym} был удален.`,
          sticky: false,
        });
        this.getToponyms();
      },
      error: (err) => {
        this.errorHandling(err);
      },
    });
  }

  onChangedPage(pageData: PageEvent) {
    this.currentPage = pageData.pageIndex + 1;
    this.pageSize = pageData.pageSize;
    console.log('this.avoidDoubleRequest');
    console.log(this.avoidDoubleRequest);
    if (!this.avoidDoubleRequest) {
      console.log('pageData');
      this.getToponyms();
    } else {
      this.avoidDoubleRequest = false;
    }
  }

  goToFirstPage() {
    if (this.currentPage != 1) this.avoidDoubleRequest = true;
    this.paginator.firstPage();
  }

  getToponyms() {
    console.log('getToponyms');
    this.addressService
      .getToponyms(
        this.type(),
        this.filterValue(),
        this.pageSize,
        this.currentPage
      )
      .subscribe({
        next: (res) => {
          this.toponyms = res.data.toponyms;
          this.length.set(res.data.length);
          console.log('toponyms');
          console.log(this.toponyms);
          this.dataSource = new MatTableDataSource(this.toponyms);
          this.dataSource.sort = this.sort;
        },
        error: (err) => {
          this.errorHandling(err);
        },
      });
  }

  errorHandling(err: any) {
    console.log(err);
    let errorMessage =
      typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
    this.messageService.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: errorMessage,
      sticky: true,
    });
  }
}
