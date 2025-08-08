import {
  Component,
  Inject,
  Injector,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
  runInInjectionContext,
} from '@angular/core';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../interfaces/user';
import { UserService } from '../../services/user.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry, MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { MatMenuModule } from '@angular/material/menu';
import { BaseListComponent } from '../../shared/base-list/base-list.component';
import { CauseOfBlockingDialogComponent } from '../../shared/dialogs/details-dialogs/user-details/cause-of-blocking-dialog/cause-of-blocking-dialog.component';
import { AddressFilter } from '../../interfaces/address-filter';
import { DetailsDialogComponent } from '../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';
import { Validators } from '@angular/forms';
import { DialogData } from '../../interfaces/dialog-props';
import * as Validator from '../../utils/custom.validator';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { GeneralFilter } from '../../interfaces/filter';
import { ErrorService } from '../../services/error.service';
import {
  ColumnDefinition,
  CONTACT_TYPES_FOR_LIST,
  ContactTypeForList,
  IMPLICITLY_DISPLAYED_COLUMNS,
  userDialogConfig
} from './users-list.config';

@Component({
  selector: 'app-users-list',
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatMenuModule,
    BaseListComponent,
    MatButtonModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent {
  dataSource!: MatTableDataSource<User>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private userService = inject(UserService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  errorService = inject(ErrorService);
  readonly dialog = inject(MatDialog);

  implicitlyDisplayedColumns: ColumnDefinition[] = IMPLICITLY_DISPLAYED_COLUMNS;
  displayedColumns = this.implicitlyDisplayedColumns.map(
    (item) => item.columnName
  );
  contactTypes: ContactTypeForList[] = CONTACT_TYPES_FOR_LIST;
  dialogProps = userDialogConfig;
  dialogConfig = {
    disableClose: true,
    minWidth: '800px',
    height: '80%',
    autoFocus: 'dialog',
    restoreFocus: true,
  };

  users!: User[];
  length = signal<number>(0);
  currentPage = 1;
  pageSize = 5;
  pageSizeOptions = [5, 10, 25, 50, 100];


  avoidDoubleRequest = false;
  filterParameters = signal<{
    viewOption: string;
    searchValue: string;
    notOnlyActual: boolean;
    exactMatch: boolean;
    filter: GeneralFilter;
    addressFilter: AddressFilter;
    strongAddressFilter: boolean;
    strongContactFilter: boolean;
  }>({
    viewOption: 'only-active',
    searchValue: '',
    notOnlyActual: false,
    exactMatch: false,
    filter: {
      roles: [],
      comment: [],
      contactTypes: [],
      dateBeginningRange: [],
      dateRestrictionRange: [],
    },
    addressFilter: {
      countries: [],
      regions: [],
      districts: [],
      localities: [],
    },
    strongAddressFilter: false,
    strongContactFilter: false,
  });
  sortParameters = signal<{
    active: string;
    direction: 'asc' | 'desc' | '';
  }>({
    active: '',
    direction: '',
  });

  allFilterParameters = computed(() => {
    console.log('this.allFilterParameters() recomputed');
    return {
      ...this.filterParameters(),
      sortParameters: { ...this.sortParameters() }, // важно делать копию
    };
  });

  //waitForAddressFilter = true;

  constructor(@Inject(Injector) private injector: Injector) {
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (let item of this.contactTypes) {
      iconRegistry.addSvgIconLiteral(
        item.type,
        sanitizer.bypassSecurityTrustHtml(item.svg)
      );
    }
  }

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        //   console.log('allFilterParameters changed:', this.allFilterParameters());
        // Прочитав signal, мы на него подписываемся
        this.allFilterParameters();
        /*         if (this.waitForAddressFilter) {
          this.waitForAddressFilter = false;
        } else { */
        this.getUsers();
        /*      } */
      });
    });
  }

  //TODO: запросы отправляются по два раза

  sortData(sort: Sort) {
    console.log('sort');
    console.log(sort);
    this.sortParameters.set(sort);
    console.log(' this.sortParameters');
    console.log(this.sortParameters());
    //this.getUsers();
  }

  onChangedPage(pageData: PageEvent) {
    /*  //console.log('pageData');
  //console.log(pageData); */
    this.currentPage = pageData.pageIndex + 1;
    this.pageSize = pageData.pageSize;
    if (!this.avoidDoubleRequest) {
      ////console.log('pageData');
      this.getUsers();
    } else {
      this.avoidDoubleRequest = false;
    }
  }

  goToFirstPage() {
    if (this.currentPage != 1) this.avoidDoubleRequest = true;
    this.paginator.firstPage();
  }

  changeColumnsView(selectedColumns: string[]) {
    this.displayedColumns = [...selectedColumns];
    ////console.log(this.displayedColumns);
  }

  onAddUserClick() {
    this.dialogProps.object = null;
    this.dialogProps.addressFilterParams.readonly = false;
    this.dialogProps.addressFilterParams.class = 'none';
    const dialogData: DialogData<User> = {
      ...this.dialogProps,
      operation: 'create',
      controlsDisable: false,
      defaultAddressParams: {
        localityId: null,
        districtId: null,
        regionId: null,
        countryId: null,
      },
    };

    const dialogRefCreate = this.dialog.open(DetailsDialogComponent, {
      ...this.dialogConfig,
      data: dialogData,
    });

    dialogRefCreate.afterClosed().subscribe((result) => {
      //console.log('The dialog was closed', result);

      if (result.name) {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${result.name} успешно создан!`,
        });
      }
      this.getUsers();
    });
  }

  onOpenUserCardClick(id: number) {
    let user;

    this.userService.getUser(id).subscribe({
      next: (res) => {
        user = res.data;
        this.dialogProps.addressFilterParams.readonly = true;
        this.dialogProps.addressFilterParams.class = 'view-mode';
        this.dialogProps.object = user;
        console.log('this.dialogProps.object', this.dialogProps.object);

        if (user.isRestricted) {
          this.dialogProps.controls.push({
            controlName: 'causeOfRestriction',
            value: null,
            validators: [Validators.required],
            type: 'inputText',
            label: 'Причина',
            category: 'extraData',
            formType: 'formControl',
          });
        }
        //console.log('this.dialogProps.addressFilterParams', this.dialogProps.addressFilterParams);

        const dialogData: DialogData<User> = {
          ...this.dialogProps,
          operation: 'view-edit',
          controlsDisable: true,
          defaultAddressParams: {
            localityId: user.address.locality ? user.address.locality.id : null,
            districtId: user.address.district ? user.address.district.id : null,
            regionId: user.address.region ? user.address.region.id : null,
            countryId: user.address.country ? user.address.country.id : null,
          },
        };

        const dialogRefCreate = this.dialog.open(DetailsDialogComponent, {
          ...this.dialogConfig,
          data: dialogData,
        });
        dialogRefCreate.afterClosed().subscribe((result) => {
          this.getUsers();
          if (result.name) {
            this.messageService.add({
              severity: 'success',
              summary: 'Подтверждение',
              detail: `Аккаунт пользователя '${result.name}' успешно обновлен!`,
            });
          }
        });
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  onBlockUserClick(id: number) {
    ////console.log(id);
    const blockingUser = this.users.find((item) => item.id == id)!.userName;
    const dialogRef = this.dialog.open(CauseOfBlockingDialogComponent, {
      data: { userName: blockingUser, userId: id },
      minWidth: '400px',
      height: '40%',
    });

    dialogRef.afterClosed().subscribe((result) => {
      ////console.log('The dialog was closed');
      if (result.success) {
        this.getUsers();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Пользователь ${blockingUser} был заблокирован.`,
        });
      }
    });
  }

  onShowUsersOrdersClick(id: number) {}

  onShowUsersSubscribersClick(id: number) {}

  onUnblockUserClick(id: number) {
    const unblockingUser = this.users.find((item) => item.id == id)!.userName;
    this.confirmationService.confirm({
      message: `Вы уверены, что хотите разблокировать пользователя ${unblockingUser}?`,
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
        this.unblockUser(id, unblockingUser);
      },
      reject: () => {},
    });
  }

  unblockUser(id: number, unblockingUser: string) {
    this.userService.unblockUser(id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${unblockingUser} был разбокирован.`,
          sticky: false,
        });
        this.getUsers();
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  onDeleteUserClick(id: number) {
    ////console.log(id);
    const deletingUser = this.users.find((item) => item.id == id)!.userName;
    this.confirmationService.confirm({
      message: `Вы уверены, что хотите удалить пользователя ${deletingUser}?<br />Данные невозможно будет восстановить!`,
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
        this.checkPossibilityToDeleteUser(id, deletingUser);
      },
      reject: () => {},
    });
  }

  checkPossibilityToDeleteUser(id: number, deletingUser: string) {
    this.userService.checkPossibilityToDeleteUser(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.deleteUser(id, deletingUser);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Пользователя ${deletingUser} невозможно удалить!\nОн является автором данных в приложении.\nРекомендуется применить блокировку вместо удаления.`,
            sticky: true,
          });
        }
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  deleteUser(id: number, deletingUser: string) {
    this.userService.deleteUser(id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Аккаунт пользователя ${deletingUser} был удален.`,
          sticky: false,
        });
        this.getUsers();
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  getUsers() {
    console.log('this.allFilterParameters()');
    console.log(this.allFilterParameters());
    this.userService
      .getListOfUsers(
        this.allFilterParameters(),
        this.pageSize,
        this.currentPage
      )
      .subscribe({
        next: (res) => {
          this.users = res.data.users;
          this.length.set(res.data.length);
          // Assign the data to the data source for the table to render
          this.dataSource = new MatTableDataSource(this.users);
          this.dataSource.sort = this.sort;
          console.log('this.users');
          console.log(this.users);
        },
        error: (err) => this.errorService.handle(err),
      });
  }

  transformDate(date: Date | string): string | null {
    return new DatePipe('ru').transform(date, 'dd.MM.yyyy');
  }

  hasOutdatedUserNames(row: any): boolean {
    return row.outdatedData.userNames.length > 0;
  }
  hasOutdatedNames(row: any): boolean {
    return row.outdatedData.names.length > 0;
  }

  hasOutdatedContacts(row: any): boolean {
    return Object.keys(row.outdatedData.contacts).length > 0;
  }

  hasOutdatedAddresses(row: any): boolean {
    return row.outdatedData.addresses.length > 0;
  }

  editContact(value: string, type: string) {
    let result = '';
    //TODO: move this logic to a service СТРАННО: когда открыта карточка пользователя, то эта функция вызывается при любом действии
    switch (type) {
      case 'vKontakte':
        result = 'https://vk.com/' + value;
        break;
      case 'instagram':
        result = 'https://www.instagram.com/' + value;
        break;
      case 'facebook':
        result = 'https://www.facebook.com/' + value;
        break;
      /*       case 'phoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'telegramPhoneNumber':
        result = value.trim().replace(/[^0-9+]/g, '');
        break;
      case 'whatsApp':
        result = value.trim().replace(/[^0-9+]/g, '');
        break; */
      default:
        result = value;
    }
    // //console.log('editContact', type, value, result);
    return result;
  }
}
