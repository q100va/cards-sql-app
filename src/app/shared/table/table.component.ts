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
  input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import {
  filter as rxFilter,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
  finalize,
  of,
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
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
import {
  PartnerMainService,
  PartnerService,
} from '../../services/partner.service';
import {
  VolunteerMainService,
  VolunteerService,
} from '../../services/volunteer.service';
import {
  HomeMainService,
  HomeService,
} from '../../services/home.service';
import { MessageWrapperService } from '../../services/message.service';
import { DateUtilsService } from '../../services/date-utils.service';

import { sanitizeText } from '../../utils/sanitize-text';
import { User } from '../../interfaces/user';
import { Partner } from '../../interfaces/partner';
import { DialogData } from '../../interfaces/dialog-props';
import {
  ColumnDefinition,
  ContactParamsForList,
  FilterComponentSource,
  FilterDraft,
  TableParams,
  ViewOption,
} from '../../interfaces/base-list';

import { BlurOnClickDirective } from '../../directives/blur-on-click.directive';
import { HasOpDirective } from '../../directives/has-op.directive';

import { BaseListComponent } from '../../shared/base-list/base-list.component';
import { DetailsDialogComponent } from '../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';
import { CauseOfBlockingDialogComponent } from './cause-of-blocking-dialog/cause-of-blocking-dialog.component';

import { CONTACT_PARAMS_FOR_LIST } from '../../shared/table/table.config';

import { ContactUrlPipe } from '../../utils/contact-url.pipe';
import { AddressFilter } from '../../interfaces/toponym';
import { zodValidator } from '../../utils/zod-validator';
import { causeOfRestrictionControlSchema } from '@shared/schemas/user.schema';
import {
  PERMISSIONS_COMPONENT_REGISTRY,
  PermissionSet,
  TableComponentType,
} from './table-permissions.registry';
import {
  ChangingByKind,
  DeletingByKind,
  Kind,
  ListDto,
  OutdatingByKind,
  OwnerByKind,
  OwnerDraftByKind,
  OwnerMainService,
  PartnerChangingData,
  PartnerDeletingData,
  PartnerDraft,
  PartnerOutdatingData,
  PartnerRestoringData,
  RestoringByKind,
  UserChangingData,
  UserDeletingData,
  UserDraft,
  UserOutdatingData,
  UserRestoringData,
  Volunteer, Home
} from 'src/app/interfaces/advanced-model';
//import { Owner } from 'src/app/interfaces/advanced-model';

@Component({
  selector: 'app-table',
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
    BlurOnClickDirective,
    HasOpDirective,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.css',
})
export class TableComponent<K extends Kind> implements OnChanges {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  private readonly msg = inject(MessageWrapperService);
  readonly dialog = inject(MatDialog);
  readonly dateUtils = inject(DateUtilsService);
  protected service!: OwnerMainService<
    OwnerByKind<K>,
    OwnerDraftByKind<K>,
    ChangingByKind<K>,
    RestoringByKind<K>,
    OutdatingByKind<K>,
    DeletingByKind<K>,
    ListDto<K>
  >;
  protected readonly userService = inject(UserService) as OwnerMainService<
    User,
    UserDraft,
    UserChangingData,
    UserRestoringData,
    UserOutdatingData,
    UserDeletingData,
    { list: User[]; length: number }
  >;

  protected readonly partnerService = inject(
    PartnerService
  ) as PartnerMainService; /* OwnerMainService<
    Partner,
    PartnerDraft,
    PartnerChangingData,
    PartnerRestoringData,
    PartnerOutdatingData,
    PartnerDeletingData,
    { list: Partner[]; length: number }
  >; */

  protected readonly volunteerService = inject(
    VolunteerService
  ) as VolunteerMainService;

    protected readonly homeService = inject(
   HomeService
  ) as HomeMainService;

  params = input.required<{
    columns: ColumnDefinition[];
    viewOptions: ViewOption[];
    componentType: FilterComponentSource;
    tableParams: TableParams;
  }>();

  kind = input.required<K>();
  private kind$ = new BehaviorSubject<Kind>('partner');
  ownerDialogConfig = input.required<DialogData<OwnerByKind<K>>>();

  owners!: OwnerByKind<K>[];

  dataSource = new MatTableDataSource<OwnerByKind<K>>([]);
  displayedColumns!: string[];
  dialogProps!: DialogData<OwnerByKind<K>>;
  contactTypes: ContactParamsForList[] = CONTACT_PARAMS_FOR_LIST;
  dialogConfig = {
    disableClose: true,
    minWidth: '800px',
    height: '80%',
    autoFocus: 'dialog',
    restoreFocus: true,
  } as const;

  sanitizeText = sanitizeText;
  //permissions!: PermissionSet<K>;

  permissions!: PermissionSet<TableComponentType>;

  loading = signal(true);
  private reloadTick = signal(0);
  private forceReload() {
    this.reloadTick.update((n) => n + 1);
  }

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

  protected getService(): OwnerMainService<
    OwnerByKind<K>,
    OwnerDraftByKind<K>,
    ChangingByKind<K>,
    RestoringByKind<K>,
    OutdatingByKind<K>,
    DeletingByKind<K>,
    ListDto<K>
  > {
    const svc =
      this.kind() === 'user'
        ? this.userService
        : this.kind() === 'partner'
        ? this.partnerService
        : this.kind() === 'volunteer'
        ? this.volunteerService
        : this.kind() === 'home'
        ? this.homeService : this.homeService;//this.seniorService
    return svc as OwnerMainService<
      OwnerByKind<K>,
      OwnerDraftByKind<K>,
      ChangingByKind<K>,
      RestoringByKind<K>,
      OutdatingByKind<K>,
      DeletingByKind<K>,
      ListDto<K>
    >;
  }
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
      const query$ = toObservable(this.query).pipe(
        rxFilter((q): q is NonNullable<typeof q> => !!q),
        distinctUntilChanged(
          (a, b) => this.stableSerialize(a) === this.stableSerialize(b)
        )
      );

      combineLatest([this.kind$, query$])
        .pipe(
          tap(() => this.loading.set(true)),
          switchMap(([kind, q]) =>
            this.fetchList(kind as K, q.filter, q.pageSize, q.page).pipe(
              tap({
                next: ({ list, length }) => {
                  console.log('list', list);
                  this.owners = list as OwnerByKind<K>[];
                  this.length.set(length ?? 0);
                  this.dataSource.data = list as OwnerByKind<K>[];
                  console.log(' this.dataSource.data', this.dataSource.data);
                  this.dataSource.sort = this.sort;
                },
                complete: () => {},
              }),
              catchError((err) => {
                this.msg.handle(err, {
                  source: `${kind}-list`,
                  stage: 'getList',
                  filter: q.filter,
                });
                return of({ list: [], length: 0 });
              }),
              finalize(() => this.loading.set(false))
            )
          ),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({ next: () => {} });
    });
  }
  ngOnInit() {
    this.displayedColumns = this.params().columns.map((c) => c.columnName);
    console.log('this.displayedColumns', this.displayedColumns);
    this.dialogProps = this.ownerDialogConfig();
    this.permissions = PERMISSIONS_COMPONENT_REGISTRY[
      this.kind()
    ] as PermissionSet<TableComponentType>;
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['kind'] && this.kind) {
      console.log('this.kind', this.kind());
      this.kind$.next(this.kind());
    }
  }
  private fetchList(
    kind: K,
    filter: any,
    pageSize: number,
    page: number
  ): Observable<ListDto<K>> {
    const service = this.getService();
    return service
      .getList(filter, pageSize, page)
      .pipe(map((res) => res?.data ?? { list: [], length: 0 }));
  }

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

  hasOutdatedNames = (row: User | Partner | Volunteer): boolean =>
    !!row?.outdatedData?.names && row.outdatedData.names.length > 0;

  hasOutdatedContacts = (row: OwnerByKind<K>): boolean =>
    !!row?.outdatedData?.contacts &&
    Object.keys(row.outdatedData.contacts).length > 0;

  hasOutdatedAddresses = (row: OwnerByKind<K>): boolean =>
    !!row?.outdatedData?.addresses && row.outdatedData.addresses.length > 0;

  hasOutdatedHomes = (row: OwnerByKind<K>): boolean => {
    //!!row?.outdatedData?.homes && row.outdatedData.homes.length > 0;
    return false;
  };
  hasOutdatedInstitutes = (row: Volunteer): boolean => {
    return (
      !!row?.outdatedData?.institutes && row.outdatedData.institutes.length > 0
    );
  };
  hasOutdatedOfficialNames = (row: Home): boolean => {
    return (
      !!row?.outdatedData?.officialNames && row.outdatedData.officialNames.length > 0
    );
  };


/*   hasHomes = (row: OwnerByKind<K>): boolean => {
    //!!row?.homes && row.homes.length > 0;
    return false;
  };
  hasInstitutes = (row: OwnerByKind<K>): boolean => {
    //!!row?.institutes && row.institutes.length > 0;
    return false;
  };
  hasSubscriptions = (row: OwnerByKind<K>): boolean => {
    //!!row?.subscriptions && row.subscriptions.length > 0;
    return false;
  };
  hasCooperations = (row: OwnerByKind<K>): boolean => {
    //!!row?.cooperations && row.cooperations.length > 0;
    return false;
  }; */
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
  onAddOwnerClick() {
    this.dialogProps.object = null;
    this.dialogProps.addressFilterParams.readonly = false;
    this.dialogProps.addressFilterParams.class = 'none';

    const dialogData: DialogData<OwnerByKind<K>> = {
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

  onOpenOwnerCardClick(id: number) {
    const service = this.getService();

    service
      .getById(id)
      .pipe()
      .subscribe({
        next: (res) => {
          const owner = res.data;
          const dialogProps = {
            ...this.dialogProps,
            addressFilterParams: {
              ...this.dialogProps.addressFilterParams,
              readonly: true,
              class: 'view-mode' as 'none' | 'view-mode' | undefined,
            },
            controls: [...(this.dialogProps.controls ?? [])],
            object: owner,
          };

          if (owner.isRestricted) {
            dialogProps.controls.push({
              controlName: 'causeOfRestriction',
              value: null,
              validators: [zodValidator(causeOfRestrictionControlSchema)],
              type: 'inputText',
              label: 'TABLE.DIALOGS.CAUSE_OF_BLOCK_LABEL',
              category: 'extraData',
              formType: 'formControl',
            });
          }

          const dialogData: DialogData<OwnerByKind<K>> = {
            ...dialogProps,
            operation: 'view-edit',
            controlsDisable: true,
            defaultAddressParams: {
              localityId: owner?.address?.locality?.id ?? null,
              districtId: owner?.address?.district?.id ?? null,
              regionId: owner?.address?.region?.id ?? null,
              countryId: owner?.address?.country?.id ?? null,
            },
          };

          this.dialog
            .open(DetailsDialogComponent, {
              ...this.dialogConfig,
              data: dialogData,
            })
            .afterClosed()
            .pipe()
            .subscribe({
              next: (r) => {
                if (r?.refresh) this.forceReload();
              },
            });
        },
        error: (err) =>
          this.msg.handle(err, {
            source: 'TableComponent',
            stage: 'openOwnerCard',
            ownerId: id,
            kind: this.kind(),
          }),
      });
  }
  //TODO:
  onShowUsersOrdersClick(id: number) {}
  onShowUsersSubscribersClick(id: number) {}
  onShowUsersVolunteersClick(id: number) {}
  onShowPartnersHomesClick(id: number) {}
  onShowVolunteersSeniorsClick(id: number) {}
  onShowVolunteersCooperationsClick(id: number) {}
  onShowVolunteersOrdersClick(id: number) {}
  onShowHomesPartnersClick(id: number) {}
  onShowHomesSeniorsClick(id: number) {}

  onBlockOwnerClick(id: number) {
    if (this.kind() !== 'partner') {
      this.blockOwner(id);
    } else {
      this.partnerService
        .checkPossibilityToBlockPartner(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (res.data == 0) this.blockOwner(id);
          },
          error: (err) =>
            this.msg.handle(err, {
              source: 'TableComponent',
              stage: 'checkPossibilityToBlockPartner',
              ownerId: id,
              kind: this.kind(),
            }),
        });
    }
  }

  private blockOwner(id: number) {
    this.dialog
      .open(CauseOfBlockingDialogComponent, {
        data: { id, kind: this.kind(), service: this.getService() },
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

  onUnblockOwnerClick(id: number) {
    const service = this.getService();
    service
      .unblockOwner(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.forceReload(),
        error: (err) =>
          this.msg.handle(err, {
            source: 'TableComponent',
            stage: 'unblockOwner',
            ownerId: id,
            kind: this.kind(),
          }),
      });

    /*     const safeUserName = this.sanitizeText(userName);
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
      accept: () => this.unblockOwner(id),
    }); */
  }

  /*   private unblockOwner(id: number) {
    this.userService
      .unblockUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.forceReload(),
        error: (err) =>
          this.msg.handle(err, {
            source: 'TableComponent',
            stage: 'unblockOwner',
            ownerId: id,
            kind: this.kind(),
          }),
      });
  } */

  onDeleteOwnerClick(owner: OwnerByKind<K>) {
    const service = this.getService();
    const name = service.getOwnerName(owner);
    const safeName = this.sanitizeText(name);

    this.confirmationService.confirm({
      message: this.translate.instant('PRIME_CONFIRM.DELETE_ITEM_MESSAGE', {
        name: safeName,
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
      accept: () => this.checkPossibilityToDeleteOwner(owner.id),
    });
  }

  private checkPossibilityToDeleteOwner(id: number) {
    const service = this.getService();
    service
      .checkPossibilityToDeleteOwner(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.data === 0) this.deleteOwner(id);
        },
        error: (err) =>
          this.msg.handle(err, {
            source: 'TableComponent',
            stage: 'checkPossibilityToDeleteOwner',
            ownerId: id,
            kind: this.kind(),
          }),
      });
  }

  private deleteOwner(id: number) {
    const service = this.getService();
    service
      .deleteOwner(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.forceReload(),
        error: (err) =>
          this.msg.handle(err, {
            source: 'TableComponent',
            stage: 'deleteOwner',
            ownerId: id,
            kind: this.kind(),
          }),
      });
  }
}
