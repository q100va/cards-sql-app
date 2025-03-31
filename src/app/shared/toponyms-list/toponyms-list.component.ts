import {
  Component,
  ViewChild,
  computed,
  inject,
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
//import { CreateToponymDialogComponent } from '../dialogs/create-toponym-dialog/create-toponym-dialog.component';

import { FileService } from '../../services/file.service';
import { UploadFileComponent } from '../upload-file/upload-file.component';
import { Router } from '@angular/router';
import { ToponymDetailsDialogComponent } from '../dialogs/toponym-details-dialog/toponym-details-dialog.component';

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
    shortName: string;
    districtId: number;
  }>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  length = signal<number>(0);
  currentPage = 1;
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50, 100];
  avoidDoubleRequest = false;
  showSpinner = signal<boolean>(false);

  params: {
    source: 'toponymCard' | 'toponymList' | 'userCard' | 'userList';
    multiple: boolean;
    cols: string;
    gutterSize: string;
    rowHeight: string;
    type?: string | undefined;
    isShowRegion: boolean;
    isShowDistrict: boolean;
    isShowLocality: boolean;
    readonly?: boolean | undefined;
    class: string;
  } = {
    source: 'toponymList',
    multiple: false,
    cols: '4',
    gutterSize: '16px',
    rowHeight: '76px',
    isShowRegion: true,
    isShowDistrict: true,
    isShowLocality: true,
    class: 'none',
  };

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

  type = model<'country' | 'region' | 'district' | 'locality'>('locality');
  // type = model<'country' | 'region' | 'district' | 'locality'>('district');
  localities?: {
    id: number;
    name: string;
    shortName: string;
    districtId: number;
  }[];

  displayedColumns = [
    'name',
    'shortName',
    'district',
    'region',
    'country',
    'actions',
  ];

  filename = 'шаблон-населенные-пункты.xlsx';

  defaultAddressParams: {
    localityId: number | null;
    districtId: number | null;
    regionId: number | null;
    countryId: number | null;
  } = {
    localityId: null,
    districtId: null,
    regionId: null,
    countryId: 143,
  };

  ngOnInit() {}
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
    /*     this.avoidDoubleRequest = true;
    this.paginator.firstPage(); */
    this.searchValue.set(searchString);
    console.log('searchToponym');
  }
  onClearSearchClick() {
    /*     this.avoidDoubleRequest = true;
    this.paginator.firstPage(); */
    this.goToFirstPage();
    this.searchValue.set('');
    console.log('onClearSearchClick');
  }

  onFileDownloadClick() {
    this.fileService.downloadFile(this.filename).subscribe({
      next: (blob) => {
        saveAs(blob, this.filename);
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

  onOpenHomesListClick(rowId: number) {}

  onOpenUsersListClick(toponym: any) {
    console.log('toponym');
    console.log(toponym);
    this.router.navigate(['/users'], {
      queryParams: {
        localityId: toponym.id,
        districtId: toponym['district.id'],
        regionId: toponym['district.region.id'],
        countryId: toponym['district.region.country.id'],
      },
    });
  }
  onOpenPartnersListClick(rowId: number) {}
  onOpenSeniorsListClick(rowId: number) {}
  onOpenLocalitiesListClick(rowId: number) {}
  onOpenDistrictsListClick(rowId: number) {}
  onOpenRegionsListClick(rowId: number) {}

  onOpenToponymCardClick(toponym: any) {
    const dialogRefCreate = this.dialog.open(ToponymDetailsDialogComponent, {
      data: {
        type: this.type(),
        operation: 'view-edit',
        defaultAddressParams: {
          localityId: toponym.id,
          districtId: toponym['district.id'],
          regionId: toponym['district.region.id'],
          countryId: toponym['district.region.country.id'],
        },
        toponym: toponym,
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
            this.deleteToponym(this.type(), id, destroy, deletingToponym);
          } else {
            //TODO: проверить на неактуальных адресах
            const detail = destroy
              ? `Топоним '${deletingToponym}' невозможно удалить!\nОн является составляющей адресов.\nПроверьте список связанных с ним интернатов, поздравляющих и пользователей.\nЭти адреса, в т.ч. неактуальные, должны быть изменены или удалены.`
              : `Топоним '${deletingToponym}' невозможно удалить!\nОн является составляющей актуальных адресов.\nПроверьте список связанных с ним интернатов, поздравляющих и пользователей.\nЭти адреса должны быть изменены, удалены или помечены как неактуальные.`;
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

  deleteToponym(
    type: string,
    id: number,
    destroy: boolean,
    deletingUser: string
  ) {
    const serviceFuncName = destroy ? 'deleteToponym' : 'blockToponym';
    this.addressService[serviceFuncName](type, id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${deletingUser} был удален.`,
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
      .getLocalities(this.filterValue(), this.pageSize, this.currentPage)
      .subscribe({
        next: (res) => {
          this.localities = res.data.toponyms;
          this.length.set(res.data.length);
          console.log('localities');
          console.log(this.localities);
          this.dataSource = new MatTableDataSource(this.localities);
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
