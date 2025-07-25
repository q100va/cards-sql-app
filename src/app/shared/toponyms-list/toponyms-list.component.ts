import {
  Component,
  ViewChild,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

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
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Toast } from 'primeng/toast';
import { saveAs } from 'file-saver';

import { BlurOnClickDirective } from '../../shared/directives/blur-on-click.directive';
import { AddressService } from '../../services/address.service';
import { FileService } from '../../services/file.service';
import { AddressFilterComponent } from '../address-filter/address-filter.component';
import { UploadFileComponent } from '../upload-file/upload-file.component';
import { ToponymDetailsDialogComponent } from '../dialogs/toponym-details-dialog/toponym-details-dialog.component';
import { ToponymProps } from '../../interfaces/toponym-props';
import { AddressFilterParams } from '../../interfaces/address-filter-params';
import { GeographyLevels, Ways } from '../../interfaces/types';
import { DefaultAddressParams } from '../../interfaces/default-address-params';
import { AddressFilter } from '../../interfaces/address-filter';
import { Toponym } from '../../interfaces/toponym';
import { DetailsDialogComponent } from '../dialogs/details-dialog/details-dialog.component';
import { DialogData } from '../../interfaces/dialog-data';

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
    MatBadgeModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    ConfirmDialogModule,
    ProgressSpinner,
    Toast,
    AddressFilterComponent,
    UploadFileComponent,
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
  private fileService = inject(FileService);
  readonly dialog = inject(MatDialog);
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

  toponyms?: Toponym[];
  toponymProps = input.required<ToponymProps>();
  type = model.required<GeographyLevels>();
  params!: AddressFilterParams;
  defaultAddressParams!: DefaultAddressParams;
  exactMatch = signal<boolean>(false);
  searchValue = signal<string>('');
  inputValue = '';
  sortParameters = signal<{
    active: string;
    direction: 'asc' | 'desc' | '';
  }>({
    active: '',
    direction: '',
  });
  addressString = signal<string>('');
  addressFilter = signal<AddressFilter>({
    countries: null,
    regions: null,
    districts: null,
    localities: null,
  });
  filterValue = computed(() => {
    return {
      searchValue: this.searchValue(),
      exactMatch: this.exactMatch(),
      addressString: this.addressString(),
      addressFilter: this.addressFilter(),
      sortParameters: this.sortParameters(),
    };
  });
  filterString = computed(() => {
    let filterString = '';
    filterString =
      filterString +
      (this.filterValue().searchValue
        ? this.filterValue().searchValue + ', '
        : '');
    filterString = filterString.slice(0, -2);
    let addressString = this.addressString();
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

  dialogConfig = {
    disableClose: true,
    minWidth: '500px',
    height: 'fit-content',
    autoFocus: 'dialog',
    restoreFocus: true,
  };

  dialogData = computed(() => {
    this.toponymProps().dialogProps.addressFilterParams = {
      ...this.toponymProps().dialogProps.addressFilterParams,
      source: 'toponymCard',
      multiple: false,
      cols: '1',
      gutterSize: '16px',
      rowHeight: '76px',
    }
    return {
      ...this.toponymProps().dialogProps,
      type: this.type(),
    };
  });

  nameWays: Ways = {
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

  showSpinner = signal<boolean>(false);

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
    if (this.toponymProps().queryParams) {
      this.defaultAddressParams.countryId = this.toponymProps().queryParams![
        'countryId'
      ]
        ? this.toponymProps().queryParams!['countryId']
        : this.defaultAddressParams.countryId;
      this.defaultAddressParams.regionId = this.toponymProps().queryParams![
        'regionId'
      ]
        ? this.toponymProps().queryParams!['regionId']
        : this.defaultAddressParams.regionId;
      this.defaultAddressParams.districtId = this.toponymProps().queryParams![
        'districtId'
      ]
        ? this.toponymProps().queryParams!['districtId']
        : this.defaultAddressParams.districtId;
      this.defaultAddressParams.localityId = this.toponymProps().queryParams![
        'localityId'
      ]
        ? this.toponymProps().queryParams!['localityId']
        : this.defaultAddressParams.localityId;
    }
  }

  sortData(sort: Sort) {
    this.sortParameters.set(sort);
  }

  onAddToponymClick() {
    this.dialogData().addressFilterParams.readonly = false;
    this.dialogData().addressFilterParams.class = 'none';
    const dialogRefCreate = this.dialog.open(DetailsDialogComponent, {
      ...this.dialogConfig,
      data: {
        ...this.dialogData(),
        operation: 'create',
        defaultAddressParams: {
          localityId: null,
          districtId: null,
          regionId: null,
          countryId: null,
        },
      },
    });
    dialogRefCreate.afterClosed().subscribe((result) => {
      if (result.name) {
        this.getToponyms();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Топоним '${result.name}' успешно создан!`,
        });
      }
    });
  }

  formDefaultAddressParams(toponym: Toponym) {
    const idWays: Ways = {
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
    let result: {
      countryId: number | null;
      regionId: number | null;
      districtId: number | null;
      localityId: number | null;
    } = { countryId: null, regionId: null, districtId: null, localityId: null };
    result.countryId = toponym[idWays[this.type()].country as keyof Toponym] as
      | number
      | null;
    result.regionId = toponym[idWays[this.type()].region as keyof Toponym] as
      | number
      | null;
    result.districtId = toponym[
      idWays[this.type()].district as keyof Toponym
    ] as number | null;
    result.localityId = toponym[
      idWays[this.type()].locality as keyof Toponym
    ] as number | null;
    return result;
  }

  onOpenToponymCardClick(toponym: Toponym) {
    this.dialogData().addressFilterParams.readonly = true;
    this.dialogData().addressFilterParams.class = 'view-mode';
    const dialogRefCreate = this.dialog.open(DetailsDialogComponent, {
      ...this.dialogConfig,
      data: {
        ...this.dialogData(),
        operation: 'view-edit',
        defaultAddressParams: this.formDefaultAddressParams(toponym),
        toponym: toponym
      },
    });
    dialogRefCreate.afterClosed().subscribe((result) => {
      this.getToponyms();
      if (result.name) {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Топоним '${result.name}' успешно обновлен!`,
        });
      }
    });
  }

  searchToponym(event: Event) {
    let searchString = (event.target as HTMLInputElement).value;
    searchString = searchString.trim().toLowerCase().replaceAll('ё', 'е');
    this.goToFirstPage();
    this.searchValue.set(searchString);
  }

  onClearSearchClick() {
    console.log('onClearSearchClick');
    this.goToFirstPage();
    this.searchValue.set('');
    this.inputValue = '';
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

  onOpenListClick(toponym: Toponym, way: string) {
    this.router.navigate([way], {
      queryParams: this.formDefaultAddressParams(toponym),
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
    if (!this.avoidDoubleRequest) {
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
    this.addressService
      .getToponyms(
        this.type(),
        this.filterValue(),
        this.pageSize,
        this.currentPage
      )
      .subscribe({
        next: (res) => {
          console.log('res.data.toponyms');
          console.log(res.data.toponyms);
          this.toponyms = res.data.toponyms;
          this.length.set(res.data.length);
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
