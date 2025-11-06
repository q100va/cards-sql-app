// src/app/pages/users-list/users-list.component.ts
import {
  Component,
  DestroyRef,
  Injector,
  ViewChild,
  computed,
  inject,
  signal,
  runInInjectionContext,
  afterNextRender,
} from '@angular/core';

import {
  filter as rxFilter,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
  finalize,
  of,
} from 'rxjs';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { DomSanitizer } from '@angular/platform-browser';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconRegistry, MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { UserService } from '../../services/user.service';
import { MessageWrapperService } from '../../services/message.service';
import { DateUtilsService } from '../../services/date-utils.service';

import { sanitizeText } from '../../utils/sanitize-text';
import { User } from '../../interfaces/user';
import { DialogData } from '../../interfaces/dialog-props';
import { ContactParamsForList, FilterDraft } from '../../interfaces/base-list';

import { BaseListComponent } from '../../shared/base-list/base-list.component';
import { DetailsDialogComponent } from '../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';
import { CauseOfBlockingDialogComponent } from './cause-of-blocking-dialog/cause-of-blocking-dialog.component';

import {
  CONTACT_PARAMS_FOR_LIST,
  IMPLICITLY_DISPLAYED_COLUMNS,
  viewOptions,
  componentType,
  userDialogConfig,
  tableParams,
} from './users-list.config';

import { ContactUrlPipe } from '../../utils/contact-url.pipe';
import { AddressFilter } from 'src/app/interfaces/toponym';
import { zodValidator } from 'src/app/utils/zod-validator';
import { causeOfRestrictionControlSchema } from '@shared/schemas/user.schema';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    BaseListComponent,
    TranslateModule,
    ContactUrlPipe,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  private readonly msg = inject(MessageWrapperService);
  readonly dialog = inject(MatDialog);
  readonly dateUtils = inject(DateUtilsService);

  dataSource!: MatTableDataSource<User>;
  users!: User[];

  sanitizeText = sanitizeText;

  params = {
    columns: IMPLICITLY_DISPLAYED_COLUMNS,
    viewOptions,
    componentType,
    tableParams,
  };
  loading = signal(true);
  private reloadTick = signal(0);
  private forceReload() {
    this.reloadTick.update((n) => n + 1);
  }

  displayedColumns = IMPLICITLY_DISPLAYED_COLUMNS.map((c) => c.columnName);
  contactTypes: ContactParamsForList[] = CONTACT_PARAMS_FOR_LIST;
  dialogProps = userDialogConfig;

  dialogConfig = {
    disableClose: true,
    minWidth: '800px',
    height: '80%',
    autoFocus: 'dialog',
    restoreFocus: true,
  } as const;

  // pagination
  length = signal(0);
  pageIndex = signal(0);
  pageSize = signal(5);
  pageSizeOptions = [5, 10, 25, 50, 100];

  // filters/sort
  filterParameters = signal<FilterDraft>({
    viewOption: 'only-active',
    searchValue: '',
    includeOutdated: false,
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

  /*
  If the BaseList provides an address filter → setDefaultAddrFilter first stores it in the signal,
  then opens the addrGate. The first request will be sent with the predefined filter already applied.
  If there’s no predefined filter → the afterNextRender in the constructor will open the addrGate at the end of the current tick,
  and the first request will be sent immediately.
  */

  addrGate = signal<boolean>(false);

  sortParameters = signal<{ active: string; direction: 'asc' | 'desc' | '' }>({
    active: '',
    direction: '',
  });

  allFilterParameters = computed(() => ({
    ...this.filterParameters(),
    sortParameters: { ...this.sortParameters() }, // keep copy to avoid accidental mutations
  }));

  private stableSerialize = (v: unknown): string => {
    const normalize = (x: any): any => {
      if (x instanceof Date) return x.toISOString();
      if (Array.isArray(x)) return x.map(normalize);
      if (x && typeof x === 'object') {
        return Object.keys(x)
          .sort()
          .reduce((acc, k) => {
            acc[k] = normalize(x[k]);
            return acc;
          }, {} as Record<string, unknown>);
      }
      return x;
    };
    return JSON.stringify(normalize(v));
  };

  private query = computed(() => {
    if (!this.addrGate()) return null;
    return {
      filter: this.allFilterParameters(),
      sort: this.sortParameters(),
      page: this.pageIndex(),
      pageSize: this.pageSize(),
      _tick: this.reloadTick(),
    };
  });

  constructor(private injector: Injector) {
    const iconRegistry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);
    for (const item of this.contactTypes) {
      iconRegistry.addSvgIconLiteral(
        item.type,
        sanitizer.bypassSecurityTrustHtml(item.svg)
      );
    }

    afterNextRender(() => {
      if (!this.addrGate()) this.addrGate.set(true);
    });

    // React on any filter/sort param change
    runInInjectionContext(this.injector, () => {
      toObservable(this.query)
        .pipe(
          rxFilter((q): q is NonNullable<typeof q> => !!q),
          distinctUntilChanged(
            (a, b) => this.stableSerialize(a) === this.stableSerialize(b)
          ),
          tap(() => this.loading.set(true)),
          switchMap((q) =>
            this.userService.getListOfUsers(q.filter, q.pageSize, q.page).pipe(
              tap((res) => {
                this.users = res.data.users;
                this.length.set(res.data.length);
                this.dataSource = new MatTableDataSource(this.users);
                this.dataSource.sort = this.sort;
              }),
              catchError((err) => {
                this.msg.handle(err, {
                  source: 'UsersListComponent',
                  stage: 'getUsers',
                  filter: q.filter,
                });
                return of(null);
              }),
              finalize(() => this.loading.set(false))
            )
          ),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
    });
  }

  ngOnInit(): void {}

  setDefaultAddrFilter(d: AddressFilter) {
    this.filterParameters.update((fp) => ({
      ...fp,
      addressFilter: d,
    }));
    this.addrGate.set(true);
  }

  // Safer template helpers (used in HTML)
  hasOutdatedUserNames = (row: User): boolean =>
    !!row?.outdatedData?.userNames && row.outdatedData.userNames.length > 0;

  hasOutdatedNames = (row: User): boolean =>
    !!row?.outdatedData?.names && row.outdatedData.names.length > 0;

  hasOutdatedContacts = (row: User): boolean =>
    !!row?.outdatedData?.contacts &&
    Object.keys(row.outdatedData.contacts).length > 0;

  hasOutdatedAddresses = (row: User): boolean =>
    !!row?.outdatedData?.addresses && row.outdatedData.addresses.length > 0;

  // ========== child → parent bridge ==========
  onAllFilterParametersChange = (p: FilterDraft) => {
  this.goToFirstPage();
  this.filterParameters.set({ ...p });
};

  // ========== sort / page ==========
  sortData(sort: Sort) {
    this.sortParameters.set(sort);
  }

  /** MatPaginator change handler: updates page index/size. */
  onChangedPage(e: PageEvent) {
    if (e.pageSize !== this.pageSize()) {
      // when page size changes, return to first page
      this.pageSize.set(e.pageSize);
      this.pageIndex.set(0);
    } else {
      this.pageIndex.set(e.pageIndex);
    }
  }

  private goToFirstPage() {
    if (this.paginator && this.pageIndex() !== 0) this.paginator.firstPage();
  }

  // ========== columns ==========
  changeColumnsView(selectedColumns: string[]) {
    this.displayedColumns = [...selectedColumns];
  }

  // ========== dialogs / CRUD ==========
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

    this.dialog
      .open(DetailsDialogComponent, { ...this.dialogConfig, data: dialogData })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res?.refresh) this.forceReload();
      });
  }

  onOpenUserCardClick(id: number) {
    this.userService
      .getUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const user = res.data;
          this.dialogProps.addressFilterParams.readonly = true;
          this.dialogProps.addressFilterParams.class = 'view-mode';
          this.dialogProps.object = user;

          if (user.isRestricted) {
            this.dialogProps.controls.push({
              controlName: 'causeOfRestriction',
              value: null,
              validators: [zodValidator(causeOfRestrictionControlSchema)],
              type: 'inputText',
              label: 'USER.CARD.CAUSE_OF_BLOCK_LABEL',
              category: 'extraData',
              formType: 'formControl',
            });
          }

          const dialogData: DialogData<User> = {
            ...this.dialogProps,
            operation: 'view-edit',
            controlsDisable: true,
            defaultAddressParams: {
              localityId: user.address.locality?.id ?? null,
              districtId: user.address.district?.id ?? null,
              regionId: user.address.region?.id ?? null,
              countryId: user.address.country?.id ?? null,
            },
          };

          this.dialog
            .open(DetailsDialogComponent, {
              ...this.dialogConfig,
              data: dialogData,
            })
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
              if (res?.refresh) this.forceReload();
            });
        },
        error: (err) =>
          this.msg.handle(err, {
            source: 'UsersListComponent',
            stage: 'onOpenUserCardClick',
            userId: id,
          }),
      });
  }
  //TODO:
  onShowUsersOrdersClick(id: number) {}
  onShowUsersSubscribersClick(id: number) {}
  onShowUsersVolunteersClick(id: number) {}

  onBlockUserClick(userId: number, userName: string) {
    this.dialog
      .open(CauseOfBlockingDialogComponent, {
        data: { userName, userId },
        disableClose: true,
        minWidth: '400px',
        height: '40%',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res?.refresh) this.forceReload();
      });
  }

  onUnblockUserClick(id: number, userName: string) {
    const safeUserName = this.sanitizeText(userName);
    this.confirmationService.confirm({
      message: this.translate.instant('PRIME_CONFIRM.UNBLOCK_ITEM_MESSAGE', {
        name: safeUserName,
      }),
      header: this.translate.instant('PRIME_CONFIRM.WARNING_HEADER'),
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: this.translate.instant('PRIME_CONFIRM.REJECT'),
      },
      acceptButtonProps: {
        label: this.translate.instant('PRIME_CONFIRM.ACCEPT'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.unblockUser(id),
    });
  }

  private unblockUser(id: number) {
    this.userService
      .unblockUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.forceReload(),
        error: (err) =>
          this.msg.handle(err, {
            source: 'UsersListComponent',
            stage: 'unblockUser',
            userId: id,
          }),
      });
  }

  onDeleteUserClick(id: number, userName: string) {
    const safeUserName = this.sanitizeText(userName);
    const deletingUser = this.users.find((u) => u.id === id)!.userName;
    this.confirmationService.confirm({
      message: this.translate.instant('PRIME_CONFIRM.DELETE_ITEM_MESSAGE', {
        name: safeUserName,
      }),
      header: this.translate.instant('PRIME_CONFIRM.WARNING_HEADER'),
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: this.translate.instant('PRIME_CONFIRM.REJECT'),
      },
      acceptButtonProps: {
        label: this.translate.instant('PRIME_CONFIRM.ACCEPT'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.checkPossibilityToDeleteUser(id, deletingUser),
    });
  }

  private checkPossibilityToDeleteUser(id: number, _userName: string) {
    this.userService
      .checkPossibilityToDeleteUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.data === 0) this.deleteUser(id);
        },
        error: (err) =>
          this.msg.handle(err, {
            source: 'UsersListComponent',
            stage: 'checkPossibilityToDeleteUser',
            userId: id,
          }),
      });
  }

  private deleteUser(id: number) {
    this.userService
      .deleteUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.forceReload(),
        error: (err) =>
          this.msg.handle(err, {
            source: 'UsersListComponent',
            stage: 'deleteUser',
            userId: id,
          }),
      });
  }
}
