import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  FormControl,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RoleService } from '../../../services/role.service';
import { MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { ErrorService } from '../../../services/error.service';

@Component({
  selector: 'app-create-role-dialog',
  imports: [
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    ConfirmDialogModule,
    Toast,
    ReactiveFormsModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './create-role-dialog.component.html',
  styleUrl: './create-role-dialog.component.css',
})
export class CreateRoleDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateRoleDialogComponent>);
  readonly data = inject<{ userId: number; userName: string }>(MAT_DIALOG_DATA);
  private messageService = inject(MessageService);
  private roleService = inject(RoleService);
  private confirmationService = inject(ConfirmationService);
  errorService = inject(ErrorService);

  //roleName = '';
  //roleDescription = '';

  roleName = new FormControl<string | null>(null, [Validators.required]);
  roleDescription = new FormControl<string | null>(null);

  onCreateRoleClick() {
    this.roleService.checkRoleName(this.roleName.value!).subscribe({
      next: (res) => {
        if (res.data) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Название ${this.roleName} уже занято! Выберите другое.`,
            sticky: true,
          });
        } else {
          this.createRole();
        }
      },
      error: (err) => this.errorService.handle(err),
    });
  }

  createRole() {
    this.roleService
      .createRole(this.roleName.value!, this.roleDescription.value!)
      .subscribe({
        next: (res) => {
          this.dialogRef.close({ roleName: res.data });
        },
        error: (err) => this.errorService.handle(err),
      });
  }
  onCancelClick(event: Event) {
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
        this.dialogRef.close({ success: false });
      },
      reject: () => {},
    });
  }
}
