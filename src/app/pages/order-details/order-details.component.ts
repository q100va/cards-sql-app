import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, map, switchMap } from 'rxjs';

import { SOURCES } from '../../../../shared/constants/orders';
import {
  OrderDetails,
  orderEditSchema,
} from '../../../../shared/schemas/order.schema';
import { OrderService } from '../../services/order.service';
import { MessageWrapperService } from '../../services/message.service';
import { DateUtilsService } from '../../services/date-utils.service';
import { zodValidator } from '../../utils/zod-validator';
import { OrderRecipientsComponent } from '../order-card/order-recipients/order-recipients.component';

@Component({
  selector: 'app-order-details',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    OrderRecipientsComponent,
    TranslateModule,
  ],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css',
})
export class OrderDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly msgWrapper = inject(MessageWrapperService);
  readonly translateService = inject(TranslateService);
  readonly dateUtils = inject(DateUtilsService);
  readonly SOURCES = SOURCES;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isEditMode = signal(false);
  order = signal<OrderDetails | null>(null);

  readonly statusOptions = [
    { id: 1, label: 'ORDER.STATUS.PENDING' },
    { id: 2, label: 'ORDER.STATUS.ACCEPTED' },
    { id: 3, label: 'ORDER.STATUS.RETURNED' },
    { id: 4, label: 'ORDER.STATUS.OVERDUE' },
  ];

  readonly form = new FormGroup({
    status: new FormControl<number>(1, {
      nonNullable: true,
      validators: [
        Validators.required,
        zodValidator(orderEditSchema.shape.status),
      ],
    }),
    source: new FormControl<number>(1, {
      nonNullable: true,
      validators: [
        Validators.required,
        zodValidator(orderEditSchema.shape.source),
      ],
    }),
    comment: new FormControl<string | null>(null, {
      validators: [zodValidator(orderEditSchema.shape.comment)],
    }),
  });

  ngOnInit(): void {
    this.isLoading.set(true);
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => this.orderService.getOrderById(id)),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.setOrder(res.data),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderDetailsComponent',
            stage: 'getOrderById',
          }),
      });
  }

  onBackClick(): void {
    this.router.navigate(['/orders']);
  }

  onEditClick(): void {
    this.isEditMode.set(true);
  }

  onCancelClick(): void {
    const order = this.order();
    if (order) {
      this.patchForm(order);
    }
    this.isEditMode.set(false);
  }

  onSaveClick(): void {
    const order = this.order();
    if (!order) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.orderService
      .updateOrder(order.id, this.form.getRawValue())
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.setOrder(res.data);
          this.isEditMode.set(false);
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderDetailsComponent',
            stage: 'updateOrder',
            orderId: order.id,
          }),
      });
  }

  sourceLabel(sourceId: number): string {
    return SOURCES.find((source) => source.id === sourceId)?.optionKey ?? '';
  }

  statusLabel(statusId: number): string {
    return (
      this.statusOptions.find((status) => status.id === statusId)?.label ?? ''
    );
  }

  translatedOccasionName(occasion: string): string {
    return String(occasion ?? '')
      .split(' ')
      .filter(Boolean)
      .map((part) =>
        /^\d+$/.test(part) ? part : this.translateService.instant(part),
      )
      .join(' ');
  }

  private setOrder(order: OrderDetails): void {
    this.order.set(order);
    this.patchForm(order);
  }

  private patchForm(order: OrderDetails): void {
    this.form.patchValue({
      status: order.status,
      source: order.source,
      comment: order.comment,
    });
  }
}
