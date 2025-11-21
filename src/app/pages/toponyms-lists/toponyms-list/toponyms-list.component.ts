//src\app\pages\toponyms-lists\toponyms-list\toponyms-list.component.ts
import {
  Component,
  DestroyRef,
  Injector,
  ViewChild,
  computed,
  inject,
  input,
  model,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  distinctUntilChanged,
  filter,
  finalize,
  of,
  switchMap,
  tap,
  catchError,
} from 'rxjs';

import { saveAs } from 'file-saver';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ConfirmationService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';

import { BlurOnClickDirective } from '../../../directives/blur-on-click.directive';
import { HasOpDirective } from '../../../directives/has-op.directive';

import { AddressService } from '../../../services/address.service';
import { FileService } from '../../../services/file.service';
import { MessageWrapperService } from '../../../services/message.service';
import { DetailsDialogComponent } from '../../../shared/dialogs/details-dialogs/details-dialog/details-dialog.component';

import {
  Toponym,
  AddressFilter,
  DefaultAddressParams,
  ToponymType,
  ToponymProps,
  typeOfListMap,
} from '../../../interfaces/toponym';
import { DialogData } from '../../../interfaces/dialog-props';

import { AddressFilterComponent } from '../../../shared/address-filter/address-filter.component';
import { UploadFileComponent } from '../../../shared/upload-file/upload-file.component';
import { sanitizeText } from '../../../utils/sanitize-text';

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
    ProgressSpinner,
    AddressFilterComponent,
    UploadFileComponent,
    BlurOnClickDirective,
    HasOpDirective,
    TranslateModule,
  ],
  providers: [],
  templateUrl: './toponyms-list.component.html',
  styleUrl: './toponyms-list.component.css',
})
export class ToponymsListComponent {
  // --- injections
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly addressService = inject(AddressService);
  private readonly fileService = inject(FileService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly dialog = inject(MatDialog);
  private reloadTick = signal(0);

  sanitizeText = sanitizeText;

  // --- inputs/models
  toponymProps = input.required<ToponymProps>();
  type = model.required<ToponymType>();

  // --- view refs
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(AddressFilterComponent)
  addressFilterComponent!: AddressFilterComponent;

  // --- table state
  dataSource = new MatTableDataSource<Toponym>([]);
  length = signal(0);
  showSpinner = signal(false);
  // --- paging/sorting
  pageIndex = signal(0); // 0-based for MatPaginator
  pageSize = signal(10);
  pageSizeOptions = [5, 10, 25, 50, 100];

  sortBy = signal<
    'name' | 'shortName' | 'postName' | 'district' | 'region' | 'country'
  >('name');
  sortDir = signal<'asc' | 'desc' | ''>('asc');

  // --- filters
  exactMatch = signal(false);
  searchValue = signal('');
  inputValue = ''; // bound to the input; normalized into searchValue on Enter
  addressString = signal('');
  addressFilter = signal<AddressFilter>({
    countries: [],
    regions: [],
    districts: [],
    localities: [],
  });

  // --- plain params for child component
  params!: {
    source: 'toponymList';
    multiple: boolean;
    cols: string;
    gutterSize: string;
    rowHeight: string;
    isShowCountry: boolean;
    isShowRegion: boolean;
    isShowDistrict: boolean;
    isShowLocality: boolean;
    class: 'none' | 'view-mode';
  };
  defaultAddressParams!: DefaultAddressParams;

  // --- derived filter object (pure; no side-effects here)
  filterValue = computed(() => ({
    searchValue: this.searchValue(),
    exactMatch: this.exactMatch(),
    addressFilter: this.addressFilter(),
    sortParameters: { active: this.sortBy(), direction: this.sortDir() },
  }));

  // --- a human-readable string for UI only (pure)
  filterString = computed(() => {
    const parts: string[] = [];
    if (this.filterValue().searchValue)
      parts.push(this.filterValue().searchValue);
    if (this.addressString()) parts.push(this.addressString());
    return parts.join(', ');
  });

  // --- unified query for loading
  private query = computed(() => ({
    type: this.type(),
    filter: this.filterValue(),
    page: this.pageIndex(),
    pageSize: this.pageSize(),
    _tick: this.reloadTick(),
  }));

  constructor() {
    // load data whenever the query changes
    runInInjectionContext(this.injector, () => {
      toObservable(this.query)
        .pipe(
          // wait for inputs to be ready
          filter((q) => !!q.type),
          // shallow stringify distinct
          distinctUntilChanged(
            (a, b) => JSON.stringify(a) === JSON.stringify(b)
          ),
          tap(() => this.showSpinner.set(true)),
          switchMap((q) =>
            this.addressService
              .getToponyms(q.type, q.filter, q.pageSize, q.page)
              .pipe(
                tap((res) => {
                  this.dataSource.data = res.data.toponyms;
                  this.length.set(res.data.length);
                }),
                catchError((err) => {
                  this.msgWrapper.handle(err, {
                    source: 'ToponymList',
                    stage: 'getToponyms',
                    type: this.type(),
                    filter: this.filterValue(),
                  });
                  return of(null);
                }),
                finalize(() => this.showSpinner.set(false))
              )
          ),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
    });
  }

  ngOnInit() {
    // Build params for address-filter child
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

    // Default address context
    const qp = this.toponymProps().queryParams;
    this.defaultAddressParams = {
      localityId: qp['localityId'] ? +qp['localityId']! : null,
      districtId: qp['districtId'] ? +qp['districtId']! : null,
      regionId: qp['regionId'] ? +qp['regionId']! : null,
      countryId: qp['countryId'] ? +qp['countryId']! : null,
    };

    this.addressFilter.set({
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
    this.addressString.set(qp['addressFilterString']);
  }

  ngAfterViewInit() {
    // Hook sort to table once
    this.dataSource.sort = this.sort;
  }

  // === UI handlers ===
  forceReload() {
    this.reloadTick.update((n) => n + 1);
  }

  /** MatSort change handler: updates signals and resets to first page. */
  onSortChange(sort: Sort) {
    const nextDir = (sort.direction || 'asc') as 'asc' | 'desc';
    const nextBy = (sort.active as any) || 'name';
    if (nextBy !== this.sortBy() || nextDir !== this.sortDir()) {
      this.sortBy.set(nextBy);
      this.sortDir.set(nextDir);
      this.goToFirstPage();
    }
  }

  /** MatPaginator change handler: updates page index/size. */
  onChangedPage(e: PageEvent) {
    if (e.pageSize !== this.pageSize()) {
      // when page size changes, return to first page
      this.pageIndex.set(0);
      this.pageSize.set(e.pageSize);
    } else {
      this.pageIndex.set(e.pageIndex);
    }
  }

  /** Normalized search submit (Enter). */
  searchToponym(event: Event) {
    const s = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase()
      .replaceAll('ё', 'е');
    this.searchValue.set(s);
    this.goToFirstPage();
  }

  /** Clear search input. */
  onClearSearchClick() {
    this.inputValue = '';
    this.searchValue.set('');
    this.exactMatch.set(false);
    this.goToFirstPage();
  }

  /** Reset paginator to the first page (signals-friendly). */
  goToFirstPage() {
    if (this.pageIndex() !== 0) this.paginator.firstPage();
  }

  /** Reset table after creating, editing, deleting, uploading */
  resetTable(id: number = -1) {
    this.addressFilterComponent.correctSelectionList(
      this.type(),
      this.addressFilter(),
      id
    );
    if (id != this.addressFilter()[typeOfListMap[this.type()]][0])
      this.forceReload();
  }

  /** Open toponym details dialog (create). */
  onAddToponymClick() {
    this.openToponymDialog('create', null);
  }

  /** Open toponym details dialog (view/edit). */
  onOpenToponymCardClick(id: number) {
    this.addressService
      .getToponym(id, this.type())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.openToponymDialog('view-edit', res.data),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'ToponymList',
            stage: 'onOpenToponymCardClick',
            toponymId: id,
            type: this.type(),
          }),
      });
  }

  /** Navigate to external lists keeping address context. */
  onOpenListClick(toponym: Toponym, way: string) {
    const addressFilterString =
      (toponym.countryName == undefined ? '' : `${toponym.countryName}, `) +
      (toponym.regionName == undefined ? '' : `${toponym.regionName}, `) +
      (toponym.districtName == undefined ? '' : `${toponym.districtName}, `) +
      toponym.name;

    this.router.navigate([way], {
      queryParams: { ...toponym.defaultAddressParams, addressFilterString },
    });
  }

  /** Delete flow with reason selector. */
  onDeleteToponymClick(rowId: number, rowShortName: string, destroy: boolean) {
    const safeToponymName = this.sanitizeText(rowShortName);
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_ITEM_MESSAGE',
        { name: safeToponymName }
      ),
      header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
      },
      acceptButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.deleteFlow(rowId, destroy),
    });
  }

  private deleteFlow(id: number, destroy: boolean) {
    this.addressService
      .checkPossibilityToDeleteToponym(this.type(), id, destroy)
      .pipe(
        switchMap((res) =>
          res.data === 0
            ? this.addressService.deleteToponym(this.type(), id, destroy)
            : of(null)
        ),
        tap(() => {
          this.resetTable(id);
        }),
        catchError((err) => {
          this.msgWrapper.handle(err, {
            source: 'ToponymList',
            stage: 'deleteFlow',
            toponymId: id,
            type: this.type(),
            destroy,
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  /** File download handler. */
  onFileDownloadClick() {
    const name = this.toponymProps().filename!;
    this.fileService
      .downloadFile(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => saveAs(blob, name),
        error: (err) => {
          this.msgWrapper.handle(err, {
            source: 'ToponymList',
            stage: 'fileDownload',
            type: this.type(),
          });
        },
      });
  }

  // --- dialog helper
  private openToponymDialog(op: 'create' | 'view-edit', obj: Toponym | null) {
    const base = this.toponymProps().dialogProps;
    const data: DialogData<Toponym> = {
      ...base,
      operation: op,
      componentType: 'toponym',
      toponymType: this.type(),
      controlsDisable: true,
      object: obj ?? null,
      defaultAddressParams: obj?.defaultAddressParams ?? {
        localityId: null,
        districtId: null,
        regionId: null,
        countryId: null,
      },
      addressFilterParams: {
        ...base.addressFilterParams,
        source: 'toponymCard',
        multiple: false,
        cols: '1',
        gutterSize: '16px',
        rowHeight: '76px',
        readonly: op !== 'create',
        class: op === 'create' ? 'none' : 'view-mode',
      },
    };

    this.dialog
      .open(DetailsDialogComponent, {
        disableClose: true,
        minWidth: '500px',
        height: 'fit-content',
        autoFocus: 'dialog',
        restoreFocus: true,
        data,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        if (data?.refresh) {
          this.resetTable(op == 'view-edit' ? obj!.id : -1);
        }
      });
  }
}
