import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Table, TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { TreeSelect } from 'primeng/treeselect';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { OccasionService } from '../../services/occasion.service';
import { OrderService } from '../../services/order.service';
import { ConfirmationService, TreeNode } from 'primeng/api';
import { MessageWrapperService } from '../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, finalize, map, switchMap } from 'rxjs';
import { Occasion } from '../../../../shared/schemas/occasion.schema';
import { Order } from '../../../../shared/schemas/order.schema';
import { HasOpDirective } from '../../directives/has-op.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { DateUtilsService } from '../../services/date-utils.service';

@Component({
  selector: 'app-orders-list',
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    MatCheckboxModule,
    MatIconModule,
    MatMenuModule,
    TableModule,
    ButtonModule,
    TreeSelect,
    IconField,
    InputIcon,
    CommonModule,
    MultiSelectModule,
    SelectModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    TranslateModule,
    HasOpDirective,
    AsyncPipe,
  ],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.css',
})
export class OrdersListComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly occasionService = inject(OccasionService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly translateService = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  readonly dateUtils = inject(DateUtilsService);

  userId: number | null = null;

  isLoading = signal<boolean>(false);
  totalRecords = 0;
  occasionId!: number;
  occasion!: Occasion;
  orders!: Order[];
  filters: Record<
    string,
    {
      value: string | boolean | number;
      matchMode: string;
      operator: string;
    }[]
  > = {};
  searchValue: string | undefined;
  selectedUsers = signal<number[]>([]);
  selectedStatuses = signal<number[]>([]);
  selectedSources = signal<number[]>([]);
  selectedNodes = signal<TreeNode[]>([]);

  private rawUserOptions$ = new BehaviorSubject<
    { id: number; userName: string }[]
  >([]);
  private rawStatusOptions$ = new BehaviorSubject<
    { value: number; label: string }[]
  >([]);
  private rawSourceOptions$ = new BehaviorSubject<
    { value: number; label: string }[]
  >([]);
  private rawOccasionNodes$ = new BehaviorSubject<TreeNode[]>([]);

  readonly userOptions$ = this.rawUserOptions$.pipe(
    map((users) =>
      users.map((user) => ({
        label: user.userName,
        value: user.id,
      })),
    ),
  );
  readonly statusOptions$ = this.rawStatusOptions$.pipe();
  readonly sourceOptions$ = this.rawSourceOptions$.pipe();
  readonly nodes$ = this.rawOccasionNodes$.pipe();

  ngOnInit() {
    const userIdParam = this.route.snapshot.paramMap.get('userId');
    this.userId = userIdParam ? Number(userIdParam) : null;
    console.log('userIdParam', userIdParam);
  }

  loadOrders(event: TableLazyLoadEvent): void {
    //const userId = this.authService.getCurrentUserSnapshot()?.id ?? null;
    //if (!this.userId) return;
    console.log('event:', event);
    this.filters = this.normalizePrimeFilters(event.filters);

    const query = {
      //userId: userId,
      offset: event.first ?? 0,
      limit: event.rows ?? 20,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
      searchValue: this.searchValue,
      filters: this.filters,
    };
    this.isLoading.set(true);
    //console.log('FILTERS:', query.filters);
    this.orderService
      .getOrders(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.orders = res.data.list;
          this.totalRecords = res.data.length;
          this.rawUserOptions$.next(res.data.options.users);
          this.rawStatusOptions$.next(res.data.options.statuses);
          this.rawSourceOptions$.next(res.data.options.sources);
          this.rawOccasionNodes$.next(res.data.options.nodes);
          console.log('res.data.options.nodes', res.data.options.nodes);
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrdersList',
            stage: 'getOrdersByOccasion',
            query,
          }),
      });
  }

  onSearchEnter(dt: Table) {
    this.loadOrders({
      first: 0,
      rows: dt.rows ?? 20,
      sortField: dt.sortField,
      sortOrder: dt.sortOrder,
      filters: dt.filters,
    });
  }

  onMultiFilterChange(
    value: number[] | null,
    selectedSignal: WritableSignal<number[]>,
    filter: (value: number[] | null) => void,
  ): void {
    //console.log('value', value);
    //console.log('selectedSignal', selectedSignal);
    //console.log('filter', filter);
    const next = value ?? [];
    selectedSignal.set(next);
    //next.forEach(item => filter(item))
    filter(next.length ? next : null);
  }

  onOccasionFilterChange(
    value: TreeNode[] | null,
    selectedNodes: WritableSignal<TreeNode[]>,
    filter: (value: TreeNode[] | null) => void,
  ): void {
    const next = value ?? [];
    console.log('value', value);
    selectedNodes.set(next);
    const selectedOccasions = value?.map((node) => node.data) ?? [];
    console.log('selectedOccasions', selectedOccasions);

    filter(selectedOccasions.length ? selectedOccasions : null);
    console.log('this.selectedNodes', this.selectedNodes);
  }

  private normalizePrimeFilters(filters: any) {
    console.log('filters', filters);
    const result: Record<
      string,
      {
        value: string | boolean | number;
        matchMode: string;
        operator: string;
      }[]
    > = {};
    const normalizedFilters = { ...(filters ?? {}) };

    if (this.userId) {
      normalizedFilters.userId = [
        {
          value: this.userId,
          matchMode: 'equals',
          operator: 'and',
        },
      ];
    }

    for (const [field, meta] of Object.entries(normalizedFilters)) {
      //console.log('Object.entries(filters ?? {})');
      const metaArray = Array.isArray(meta)
        ? meta.filter(
            (m) => m.value !== null && m.value !== undefined && m.value !== '',
          )
        : [];

      if (metaArray.length) {
        result[field] = [...metaArray];
      }
    }
    console.log('result:', result);
    return result;
  }

  clear(dt: Table) {
    this.searchValue = '';
    this.selectedUsers.set([]);
    this.selectedStatuses.set([]);
    this.selectedSources.set([]);
    this.selectedNodes.set([]);
    dt.reset();
  }

  onAddOrderClick(dt: Table) {
    /*    const dialogRef = this.dialog.open(OrderDetailsDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      minHeight: '350px',
      height: 'auto',
      maxHeight: '80%',
      data: this.occasion,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((occasionName) => {
        if (occasionName) {
          this.clear(dt);
        }
      }); */
  }

  getOrderOccasionName(order: Order): string {
    return String(order.occasion ?? '')
      .split(' ')
      .filter(Boolean)
      .map((part) =>
        /^\d+$/.test(part) ? part : this.translateService.instant(part),
      )
      .join(' ');
  }

  onUpdateOrderStatusClick(orderId: number, dt: Table, status: 1 | 2 | 3 | 4) {
    this.isLoading.set(true);
    this.orderService
      .updateOrderStatus(orderId, status)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.loadOrders({
            first: 0,
            rows: dt.rows ?? 20,
            sortField: dt.sortField,
            sortOrder: dt.sortOrder,
            filters: dt.filters,
          });
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrdersList',
            stage: 'onUpdateOrderStatusClick',
            orderId,
            status,
          }),
      });
  }

  onViewOrderClick(orderId: number): void {
    this.router.navigate(['/orders/order', orderId, this.userId ?? 0]);
  }

  onDeleteOrderClick(orderId: number, dt: Table) {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_ITEM_MESSAGE',
        {
          name: 'PRIME_CONFIRM.DELETE_ORDER',
        },
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
      accept: () => this.deleteOrder(orderId, dt),
    });
  }

  deleteOrder(orderId: number, dt: Table) {
    this.isLoading.set(true);

    this.orderService
      .deleteOrder(orderId)
      .pipe(
        //finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.loadOrders({
            first: 0,
            rows: dt.rows ?? 20,
            sortField: dt.sortField,
            sortOrder: dt.sortOrder,
            filters: dt.filters,
          });
        },
        error: (err) => {
          this.isLoading.set(false);
          this.msgWrapper.handle(err, {
            source: 'OrdersList',
            stage: 'deleteOrder',
            orderId,
          });
        },
      });
  }
}
