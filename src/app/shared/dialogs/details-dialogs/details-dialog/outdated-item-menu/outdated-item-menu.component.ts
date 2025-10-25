import { Component, input, output, EventEmitter, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
//import { OutdatedDataType } from '../../interfaces/user';
import { ConfirmationService } from 'primeng/api';

/* export type RestoreDeletePayload<T extends string = string> = {
  type: T;
  id: number;
}; */

@Component({
  selector: 'app-outdated-item-menu',
  standalone: true,
  imports: [MatMenuModule, MatButtonModule, MatIconModule],
  templateUrl: './outdated-item-menu.component.html',
})
export class OutdatedItemMenuComponent {
/*   typeOfData = input.required<T>();
  itemId = input.required<number>();
 */
  confirmationService = inject(ConfirmationService);

  readonly restore = output<void>();
  readonly delete = output<void>();
  readonly params = input<{isRecoverable: boolean}>();

  handleRestore() {
    this.confirmationService.confirm({
      message: 'Вы уверены, что хотите восстановить эти данные как актуальные?',
      header: 'Подтверждение восстановления',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.restore.emit();
      },
/*       reject: () => {
        this.restore.emit(false);
      }, */
    });
  }

  handleDelete() {
    this.confirmationService.confirm({
      message:
        'Вы уверены, что хотите удалить эти данные как ошибочные? <br> После сохранения изменений это действие нельзя будет отменить.',
      header: 'Подтверждение удаления',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.delete.emit();
      },
/*       reject: () => {
        this.restore.emit(false);
      }, */
    });
  }
}
