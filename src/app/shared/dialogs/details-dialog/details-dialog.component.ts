import { Component, ViewChild, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ConfirmationService, MessageService} from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

import { ToponymDetailsComponent } from './toponym-details/toponym-details.component';
import { DialogData } from '../../../interfaces/dialog-data';

@Component({
  selector: 'app-details-dialog',
  imports: [
    MatGridListModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    ConfirmDialogModule,
    Toast,
    ToponymDetailsComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './details-dialog.component.html',
  styleUrl: './details-dialog.component.css',
})
export class DetailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DetailsDialogComponent>);
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private confirmationService = inject(ConfirmationService);
  @ViewChild(ToponymDetailsComponent)
  toponymDetailsComponent!: ToponymDetailsComponent;

  title =
    this.data.operation == 'create'
      ? this.data.creationTitle
      : this.data.viewTitle;

  isEditMode = signal<boolean>(false);
  changes = signal<boolean>(false);
  isSaveDisabled = signal<boolean>(true);

  ngOnInit() {}

  onSaveClick(action: 'justSave' | 'saveAndExit') {
    this.toponymDetailsComponent.onSaveClick(action);
  }

  onEditClick() {
    this.toponymDetailsComponent.onEditClick();
  }

  onViewClick() {
    this.toponymDetailsComponent.onViewClick();
  }

  onCancelClick(event: Event) {
    if (
      (this.data.operation == 'view-edit' && !this.isEditMode()) ||
      (this.isEditMode() && !this.changes())
    ) {
      this.dialogRef.close({ name: null });
    } else {
      this.confirmationService.confirm({
        target: event.target as EventTarget,
        message: 'Вы уверены, что хотите выйти без сохранения?',
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
          this.dialogRef.close({ name: null });
        },
        reject: () => {},
      });
    }
  }

  closeDialog(data: string) {
    this.dialogRef.close({ name: data });
  }
}
