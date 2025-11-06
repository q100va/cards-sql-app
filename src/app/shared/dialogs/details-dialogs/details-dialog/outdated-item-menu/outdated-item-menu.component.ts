import { Component, input, output, EventEmitter, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
//import { OutdatedDataType } from '../../interfaces/user';
import { ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

/* export type RestoreDeletePayload<T extends string = string> = {
  type: T;
  id: number;
}; */

@Component({
  selector: 'app-outdated-item-menu',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule, TranslateModule],
  templateUrl: './outdated-item-menu.component.html',
})
export class OutdatedItemMenuComponent {
  /*   typeOfData = input.required<T>();
  itemId = input.required<number>();
 */
  confirmationService = inject(ConfirmationService);

  readonly restore = output<void>();
  readonly delete = output<void>();
  readonly params = input<{ isRecoverable: boolean }>();
  private readonly translateService = inject(TranslateService);

  handleRestore() {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.RESTORE_OUTDATED_DATA'
      ),
      header: this.translateService.instant('PRIME_CONFIRM.WARNING_HEADER'),
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.REJECT'),
      },
      acceptButtonProps: {
        label: this.translateService.instant('PRIME_CONFIRM.ACCEPT'),
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.restore.emit();
      },
    });
  }

  handleDelete() {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_OUTDATED_DATA'
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
      accept: () => {
        this.delete.emit();
      },
    });
  }
}
