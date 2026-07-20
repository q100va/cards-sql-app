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
import { ConfirmationService } from 'primeng/api';
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
  searchValue: string | undefined;
  selectedUsers = signal<number[]>([]);
  selectedStatuses = signal<string[]>([]);

  statusOptions = [
    {
      label: this.translateService.instant('RECIPIENT.TABLE_ABSENT_STATUS'),
      value: true,
    },
    {
      label: this.translateService.instant('RECIPIENT.TABLE_EMPTY_STATUS'),
      value: false,
    },
  ];

  private rawUserOptions$ = new BehaviorSubject<
    { id: number; userName: string }[]
  >([]);

  readonly userOptions$ = this.rawUserOptions$.pipe(
    map((users) =>
      users.map((user) => ({
        label: user.userName,
        value: user.id,
      })),
    ),
  );

  ngOnInit() {
    const userIdParam = this.route.snapshot.paramMap.get('userId');
    this.userId = userIdParam ? Number(userIdParam) : null;
    console.log('userIdParam', userIdParam);

    /* TODO:     this.route.paramMap
      .pipe(
        map((params) => Number(params.get('occasionId'))),
        switchMap((occasionId) => {
          this.occasionId = occasionId;
          console.log('this.occasionId:', occasionId);
          return this.occasionService.getOccasionById(occasionId);
        }),
      )
      .subscribe({
        next: (res) => {
          console.log('res.data:', res.data);
          this.occasion = res.data;
        },
        error: (err) => {
          this.msgWrapper.handle(err, {
            source: 'OrdersListComponent',
            stage: 'getOccasionById',
            occasionId: this.occasionId,
          });
        },
      }); */
  }

  loadOrders(event: TableLazyLoadEvent): void {
    //const userId = this.authService.getCurrentUserSnapshot()?.id ?? null;
    if (!this.userId) return;
    console.log('event:', event);
    const query = {
      //userId: userId,
      offset: event.first ?? 0,
      limit: event.rows ?? 20,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
      searchValue: this.searchValue,
      filters: this.normalizePrimeFilters(event.filters, this.userId),
    };
    this.isLoading.set(true);
    //console.log('FILTERS:', query.filters);
    this.orderService
      .getOrdersByUserId(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.orders = res.data.list;
          this.totalRecords = res.data.length;
          this.rawUserOptions$.next(res.data.options.user);//TODO: API
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
    value: string[] | null,
    selectedSignal: WritableSignal<string[]>,
    filter: (value: string[] | null) => void,
  ): void {
    console.log('selectedSignal', selectedSignal);
    const next = value ?? [];
    selectedSignal.set(next);
    filter(next.length ? next : null);
  }

  private normalizePrimeFilters(filters: any, userId: number) {
    //console.log('normalizePrimeFilters');
    const result: Record<
      string,
      {
        value: string | boolean | number;
        matchMode: string;
        operator: string;
      }[]
    > = {};
    const normalizedFilters = { ...(filters ?? {}) };
    if (!normalizedFilters.userId) {
      normalizedFilters.userId = [];
    }
    if (Array.isArray(normalizedFilters.userId)) {
      normalizedFilters.userId = [
        ...normalizedFilters.userId,
        {
          value: userId,
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
      //console.log('metaArray:', metaArray);
      if (metaArray.length) {
        result[field] = [...metaArray];
      }
    }

    return result;
  }

  clear(dt: Table) {
    this.searchValue = '';
    dt.reset();
  }

  cannotDeleteOrders() {}

  /*   getOccasionName(occasion: Occasion) {
    return (
      this.translateService.instant(occasion!.type) +
      ' ' +
      (occasion!.monthNameKey
        ? this.translateService.instant(occasion!.monthNameKey)
        : '') +
      ' ' +
      occasion!.year
    );
  } */

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

  onConfirmOrderClick(orderId: number) {}
  onCancelOrderClick(orderId: number) {}
  onMoveToOverdueOrderClick(orderId: number) {}
  onMoveToReturnedOrderClick(orderId: number) {}
  onRestoreOrderClick(orderId: number) {}

  onViewOrderClick(orderId: number) {
    this.router.navigate(['/orders', orderId]);
  }

  onDeleteOrderClick(orderId: number) {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_ITEM_MESSAGE',
        {
          name: 'PRIME_CONFIRM.DELETE_ORDER', //TODO:
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
      accept: () => this.deleteOrder(orderId),
    });
  }

  deleteOrder(orderId: number) {
    this.isLoading.set(true);

    /*    this.orderService
      .deleteOrders(selectedOrderIds, this.occasion.id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.clear(dt);
          this.selectedOrders = [];
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrdersList',
            stage: 'deleteOrders',
            selectedOrderIds,
          }),
      }); */
  }
}
