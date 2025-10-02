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
import { ConfirmationService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { saveAs } from 'file-saver';

import { BlurOnClickDirective } from '../../../directives/blur-on-click.directive';
import { AddressService } from '../../../services/address.service';
import { FileService } from '../../../services/file.service';
import { AddressFilterComponent } from '../../../shared/address-filter/address-filter.component';
import { UploadFileComponent } from '../../../shared/upload-file/upload-file.component';
import { DialogData, ToponymProps } from '../../../interfaces/dialog-props';
import { AddressFilterParams } from '../../../interfaces/address-filter-params';
import { ToponymType, ToponymField, Ways } from '../../../interfaces/types';
import { DefaultAddressParams } from '../../../interfaces/default-address-params';
import { AddressFilter } from '../../../interfaces/address-filter';
import { Toponym } from '../../../interfaces/toponym';
import { DetailsDialogComponent } from '../../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';
import { MessageWrapperService } from '../../../services/message.service';

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
    ToastModule,
    AddressFilterComponent,
    UploadFileComponent,
    BlurOnClickDirective,
  ],
  providers: [],
  templateUrl: './toponyms-list.component.html',
  styleUrl: './toponyms-list.component.css',
})
export class ToponymsListComponent {
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private addressService = inject(AddressService);
  private fileService = inject(FileService);
  readonly dialog = inject(MatDialog);
  private readonly msgWrapper = inject(MessageWrapperService);
  dataSource!: MatTableDataSource<Toponym>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  length = signal<number>(0);
  currentPage = 1;
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50, 100];
  avoidDoubleRequest = false;

  toponyms!: Toponym[];
  toponymProps = input.required<ToponymProps>();
  type = model.required<ToponymType>();
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
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });
  //addressStringValue: string = '';
  //waitForAddressFilter = true;

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
    // let addressString = this.addressString();
    let result = '';
    if (this.filterValue().addressString) {
      result = filterString
        ? filterString + ', ' + this.filterValue().addressString
        : this.filterValue().addressString;
    } else {
      result = filterString ? filterString : '';
    }
    console.log('filterValue', this.filterValue());
    /*     if (this.waitForAddressFilter) {
      this.waitForAddressFilter = false;
    } else { */
    this.getToponyms();
    /*  } */
    return result;
  });

  dialogConfig = {
    disableClose: true,
    minWidth: '500px',
    height: 'fit-content',
    autoFocus: 'dialog',
    restoreFocus: true,
  };

  dialogData = computed<DialogData<Toponym>>(() => {
    this.toponymProps().dialogProps.addressFilterParams = {
      ...this.toponymProps().dialogProps.addressFilterParams,
      source: 'toponymCard',
      multiple: false,
      cols: '1',
      gutterSize: '16px',
      rowHeight: '76px',
    };
    return {
      ...this.toponymProps().dialogProps,
      toponymType: this.type(),
    };
  });

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
        ? +this.toponymProps().queryParams!['countryId']!
        : this.defaultAddressParams.countryId;
      this.defaultAddressParams.regionId = this.toponymProps().queryParams![
        'regionId'
      ]
        ? +this.toponymProps().queryParams!['regionId']!
        : this.defaultAddressParams.regionId;
      this.defaultAddressParams.districtId = this.toponymProps().queryParams![
        'districtId'
      ]
        ? +this.toponymProps().queryParams!['districtId']!
        : this.defaultAddressParams.districtId;
      this.defaultAddressParams.localityId = this.toponymProps().queryParams![
        'localityId'
      ]
        ? +this.toponymProps().queryParams!['localityId']!
        : this.defaultAddressParams.localityId;
    }
  }

  sortData(sort: Sort) {
    this.sortParameters.set(sort);
  }

  onAddToponymClick() {
    this.dialogData().addressFilterParams.readonly = false;
    this.dialogData().addressFilterParams.class = 'none';
    this.dialogData().object = null;
    const dialogData: DialogData<Toponym> = {
      ...this.dialogData(),
      operation: 'create',
      controlsDisable: true,
      defaultAddressParams: {
        localityId: null,
        districtId: null,
        regionId: null,
        countryId: null,
      },
      componentType: 'toponym',
    };
    const dialogRefCreate = this.dialog.open(DetailsDialogComponent, {
      ...this.dialogConfig,
      data: dialogData,
    });
    dialogRefCreate.afterClosed().subscribe(() => {
      this.getToponyms();
    });
  }

  onOpenToponymCardClick(id: number) {
    this.addressService.getToponym(id, this.type()).subscribe({
      next: (res) => {
        this.dialogData().addressFilterParams.readonly = true;
        this.dialogData().addressFilterParams.class = 'view-mode';
        this.dialogData().object = res.data;
        const dialogData: DialogData<Toponym> = {
          ...this.dialogData(),
          operation: 'view-edit',
          controlsDisable: true,
          defaultAddressParams: res.data.defaultAddressParams,
          componentType: 'toponym',
        };

        const dialogRefCreate = this.dialog.open(DetailsDialogComponent, {
          ...this.dialogConfig,
          data: dialogData,
        });
        dialogRefCreate.afterClosed().subscribe(() => {
          this.getToponyms();
        });
      },
      error: (err) =>
        this.msgWrapper.handle(err, {
          source: 'ToponymList',
          stage: 'onOpenToponymCardClick',
          toponymId: id,
          type: this.type(),
        }),
    });
  }

  searchToponym(event: Event) {
    let searchString = (event.target as HTMLInputElement).value;
    searchString = searchString.trim().toLowerCase().replaceAll('ё', 'е');
    this.goToFirstPage();
    this.searchValue.set(searchString);
  }

  onClearSearchClick() {
    //console.log('onClearSearchClick');
    this.goToFirstPage();
    this.searchValue.set('');
    this.inputValue = '';
  }

  onOpenListClick(toponym: Toponym, way: string) {
    this.router.navigate([way], {
      queryParams: toponym.defaultAddressParams, //this.addDefaultAddressParams(toponym),
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
        this.checkPossibilityToDeleteToponym(rowId, destroy);
      },
      reject: () => {},
    });
  }

  checkPossibilityToDeleteToponym(id: number, destroy: boolean) {
    this.addressService
      .checkPossibilityToDeleteToponym(this.type(), id, destroy)
      .subscribe({
        next: (res) => {
          if (res.data === 0) {
            this.deleteToponym(id, destroy);
          } else {
            /*             //TODO: проверить на неактуальных адресах
            const detail = destroy
              ? `Топоним '${deletingToponym}' невозможно удалить!\nОн является составляющей адресов или имеет подчиненные топонимы.\nПроверьте список связанных с ним топонимов, интернатов, поздравляющих и пользователей.\nЭти адреса, в т.ч. неактуальные, и топонимы должны быть изменены или удалены.`
              : `Топоним '${deletingToponym}' невозможно удалить!\nОн является составляющей актуальных адресов или имеет подчиненные топонимы.\nПроверьте список связанных с ним топонимов, интернатов, поздравляющих и пользователей.\nЭти адреса и топонимы должны быть изменены, удалены или помечены как неактуальные.`;
            this.msgWrapper.warn(detail); */
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ToponymList',
            stage: 'checkPossibilityToDeleteToponym',
            toponymId: id,
            type: this.type(),
            destroy,
          }),
      });
  }

  deleteToponym(id: number, destroy: boolean) {
    this.addressService.deleteToponym(this.type(), id, destroy).subscribe({
      next: (res) => {
        this.getToponyms();
      },
      error: (err) =>
        this.msgWrapper.handle(err, {
          source: 'ToponymList',
          stage: 'deleteToponym',
          toponymId: id,
          type: this.type(),
          destroy,
        }),
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
          console.log('res.data.toponyms');
          console.log(res.data.toponyms);
          this.toponyms = res.data.toponyms;
          this.length.set(res.data.length);
          this.dataSource = new MatTableDataSource(this.toponyms);
          this.dataSource.sort = this.sort;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ToponymList',
            stage: 'getToponyms',
            type: this.type(),
            filter: this.filterValue(),
          }),
      });
  }

  onFileDownloadClick() {
    this.fileService.downloadFile(this.toponymProps().filename!).subscribe({
      next: (blob) => saveAs(blob, this.toponymProps().filename),
      error: (err) => {
        // если сервер прислал текст ошибки — можно прочитать
        if (err?.error instanceof Blob) {
          err = new Error(`Download error: ${err.error.text()}`);
        }
        this.msgWrapper.handle(
          err,
          {
            source: 'ToponymList',
            stage: 'fileDownload',
            type: this.type()
          }
        );
      }
    });

    /*    this.fileService.downloadFile(this.toponymProps().filename!).subscribe({
      next: (blob) => {
        saveAs(blob, this.toponymProps().filename);
      },
      error: (err) => {
        this.msgWrapper.handle({
          error: 'Невозможно загрузить выбранный файл: ' + err,
        });
      },
    }); */
  }
}
