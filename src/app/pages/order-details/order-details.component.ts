import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, catchError, finalize, map, switchMap } from 'rxjs';

import {
  OrderDetails,
} from '../../../../shared/schemas/order.schema';
import { OrderService } from '../../services/order.service';
import { MessageWrapperService } from '../../services/message.service';
import { DateUtilsService } from '../../services/date-utils.service';
import { OrderRecipientsComponent } from '../order-card/order-recipients/order-recipients.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-order-details',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
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
  readonly authService = inject(AuthService);
  readonly translateService = inject(TranslateService);
  readonly dateUtils = inject(DateUtilsService);

  readonly isLoading = signal(false);

  order = signal<OrderDetails | null>(null);
  orderId!: number;
  userId!: number | null;




  ngOnInit(): void {
    this.isLoading.set(true);
    this.route.paramMap
      .pipe(
        map((params) => ({
          orderId: Number(params.get('orderId')),
          userId: Number(params.get('userId')) || null,
        })),

        switchMap(({ orderId, userId }) => {
          this.orderId = orderId;
          this.userId = userId;

          this.order.set(null);
          this.isLoading.set(true);

          return this.orderService
            .getOrderById(orderId)
            .pipe(
              catchError((err) => {
                this.msgWrapper.handle(err, {
                  source: 'OrderDetailsComponent',
                  stage: 'getOrderById',
                  orderId,
                  userId,
                });
                return EMPTY;
              }),
              finalize(() => this.isLoading.set(false)),
            );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.setOrder(res.data),

        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderDetailsComponent',
            stage: 'getOrderById',
            orderId: this.orderId,
            userId: this.userId,
          }),
      });
  }
  onBackClick(): void {
    if (this.userId) {
      this.router.navigate([`/orders/${this.userId}`]);
    } else {
      this.router.navigate(['/orders']);
    }
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
  }

  changeRecipientsList(deletingIds: number[]) {
    if (!this.order() || !this.authService.has('EDIT_ORDER')) return;
    this.isLoading.set(true);
    this.orderService
      .editOrderRecipientsList(this.order()!.id, deletingIds)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.setOrder(res.data),
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'OrderDetailsComponent',
            stage: 'changeRecipientsList',
            orderId: this.order()!.id,
          }),
      });
  }

}
