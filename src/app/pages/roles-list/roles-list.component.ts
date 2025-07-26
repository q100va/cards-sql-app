import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { TableModule } from 'primeng/table';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CreateRoleDialogComponent } from '../../shared/dialogs/create-role-dialog/create-role-dialog.component';
import { Toast } from 'primeng/toast';

import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MatGridListModule } from '@angular/material/grid-list';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-roles-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    TableModule,
    MatCheckboxModule,
    MatIconModule,
    Toast,
    FormsModule,
    InputTextModule,
    MatGridListModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, MessageService, ConfirmationService],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.css',
})
export class RolesListComponent {
  operations!: {
    [key: string]:
      | string
      | boolean
      | []
      | { id: number; access: boolean; disabled: boolean }[];
  }[];
  roles!: { id: number; name: string; description: string }[];
  readonly dialog = inject(MatDialog);
  private messageService = inject(MessageService);
  private roleService = inject(RoleService);
  private confirmationService = inject(ConfirmationService);

  ngOnInit() {
    this.getRoles();
  }

  onAddRoleClick() {
    const dialogRef = this.dialog.open(CreateRoleDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      height: '40%',
    });
    dialogRef.afterClosed().subscribe((result) => {
      //console.log('The dialog was closed');
      if (result.roleName) {
        this.getRoles();
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Роль '${result.roleName}' успешно создана!`,
        });
      }
    });
  }

  onInputChange(index: number) {
    if (this.roles[index]['name'] && this.roles[index]['description']) {
      this.roleService.updateRole(this.roles[index]).subscribe({
        next: (res) => {},
        error: (err) => {
          console.log(err);
          let errorMessage =
            typeof err.error === 'string'
              ? err.error
              : 'Ошибка: ' + err.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: errorMessage,
            sticky: true,
          });
        },
      });
    }
  }

  onAccessChangeCheck(
    value: boolean,
    roleId: number,
    operation: {
      [key: string]: string | boolean | [] | { [key: string]: boolean }[];
    }
  ) {
    //console.log(value, roleId, operation);
    this.roleService.updateRoleAccess(value, roleId, operation).subscribe({
      next: (res) => {
        if (res) {
          this.getRoles();
        }
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  onDeleteRoleClick(index: number) {
    this.confirmationService.confirm({
      message: `Вы уверены, что хотите удалить роль '${this.roles[index].name}'?<br />Данные невозможно будет восстановить!`,
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
        this.checkPossibilityToDeleteRole(this.roles[index].id, this.roles[index].name);
      },
      reject: () => {},
    });
  }

  checkPossibilityToDeleteRole(id: number, deletingRole: string) {
    this.roleService.checkPossibilityToDeleteRole(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.deleteUser(id, deletingRole);
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Ошибка',
            detail: `Роль '${deletingRole}' невозможно удалить!\nОна присвоена некоторым пользователям.\nРекомендуется предварительно изменить роль для этих пользователей.`,
            sticky: true,
          });
        }
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }

  deleteUser(id: number, deletingRole: string) {
    this.roleService.deleteRole(id).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Подтверждение',
          detail: `Роль '${deletingRole}' была удалена.`,
          sticky: false,
        });
        this.getRoles();
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });


  }


  getRoles() {
    this.roleService.getRoles().subscribe({
      next: (res) => {
        this.roles = res.data.roles;
        this.operations = res.data.operations;
        /*         //console.log("this.roles");
        //console.log(this.roles);
        //console.log("this.operations");
        //console.log(this.operations); */
      },
      error: (err) => {
        console.log(err);
        let errorMessage =
          typeof err.error === 'string' ? err.error : 'Ошибка: ' + err.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: errorMessage,
          sticky: true,
        });
      },
    });
  }
}
