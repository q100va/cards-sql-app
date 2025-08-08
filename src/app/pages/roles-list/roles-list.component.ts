import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormsModule } from '@angular/forms';
// PrimeNG imports
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
// Application imports
import { CreateRoleDialogComponent } from './create-role-dialog/create-role-dialog.component';
import { RoleService } from '../../services/role.service';
import { ErrorService } from '../../services/error.service';
import { Operation, Role } from '../../interfaces/role';
import { trackById } from '../../utils/track-by-id.util';

// Interface for configuring user notifications
interface MessageConfig {
  severity: string;
  summary: string;
  detail: string;
  sticky?: boolean;
}

@Component({
  selector: 'app-roles-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    MatCheckboxModule,
    MatIconModule,
    FormsModule,
    TableModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  providers: [],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css'],
})
export class RolesListComponent implements OnInit, OnDestroy {
  // Public properties
  operations!: Operation[];
  roles!: Role[];
  isLoading = signal<boolean>(false);
  tableStyle = { 'min-width': '75rem' };
  trackById = trackById;
  scrollHeight = '800px';
  // Private properties
  private readonly subscriptions = new Subscription();
  private readonly messageService = inject(MessageService);
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dialog = inject(MatDialog);
  protected readonly errorService = inject(ErrorService);

  // Lifecycle hooks
  ngOnInit(): void {
    this.loadRoles();
    const height = window.innerHeight * 0.8;
    this.scrollHeight = `${height}px`;
    console.log(" this.scrollHeight",  this.scrollHeight)
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // Public methods

  /**
   * Opens the Add Role dialog and handles the adding process.
   */
  onAddRoleClick(): void {
    const dialogRef = this.dialog.open(CreateRoleDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      height: '40%',
    });
    const subscription = dialogRef.afterClosed().subscribe((result) => {
      if (result?.roleName) {
        this.loadRoles();
        const safeRoleName = this.sanitizeText(result.roleName);
        this.showMessage({
          severity: 'success',
          summary: 'Успешно',
          detail: `Роль '${safeRoleName}' создана`,
        });
      }
    });
    this.subscriptions.add(subscription);
  }

  /**
   * Handles input change events for updating a role.
   * @param index - The index of the role in the roles array.
   */
  onInputChange(index: number): void {
    const role = this.roles[index];
    if (role.name && role.description) {
      const subscription = this.roleService.updateRole(role).subscribe({
        next: () => {
          const safeRoleName = this.sanitizeText(role.name);
          this.showMessage({
            severity: 'success',
            summary: 'Успешно',
            detail: `Роль '${safeRoleName}' обновлена`,
          });
        },
        error: (err) => this.errorService.handle(err),
      });
      this.subscriptions.add(subscription);
    }
  }

  /**
   * Handles the change of access rights for a role's operation.
   * @param value - New value of the checkbox.
   * @param roleId - The role's identifier.
   * @param operation - Associated operation.
   */
  onAccessChangeCheck(
    value: boolean,
    roleId: number,
    operation: Operation
  ): void {
    const subscription = this.roleService
      .updateRoleAccess(value, roleId, operation)
      .subscribe({
        next: (res) => {
          if (res) {
            this.loadRoles();
          }
        },
        error: (err) => this.errorService.handle(err),
      });
    this.subscriptions.add(subscription);
  }

  /**
   * Prompts the user to confirm deletion of a role.
   * @param index - The index of the role in the roles array.
   */
  onDeleteRoleClick(index: number): void {
    const role = this.roles[index];
    const safeRoleName = this.sanitizeText(role.name);

    this.confirmationService.confirm({
      message: `Удалить роль '${safeRoleName}'?<br \>Данные невозможно будет восстановить.`,
      header: 'Подтверждение',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Нет',
      },
      acceptButtonProps: {
        label: 'Да',
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.checkPossibilityToDeleteRole(role.id, safeRoleName),
    });
  }

  // Private methods
  /**
   * Sanitizes input text to prevent Cross-Site Scripting (XSS) attacks.
   * @param text - The text to sanitize.
   * @returns The sanitized text.
   */
  private sanitizeText(text: string): string {
    if (!text) {
      return '';
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  /**
   * Loads roles and operations from the RoleService.
   */
  private loadRoles(): void {
    this.isLoading.set(true);
    const subscription = this.roleService
      .getRoles()
      .pipe(
        // Ensure loading indicator is deactivated after the call completes
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.roles = res.data.roles;
          this.operations = res.data.operations;
          console.log('this.operations', this.operations);
        },
        error: (err) => this.errorService.handle(err),
      });
    this.subscriptions.add(subscription);
  }

  //TODO: перечислить пользователей!
  /**
   * Checks if a role can be safely deleted.
   * @param id - The role's identifier.
   * @param safeRoleName - The sanitized role name.
   */
  private checkPossibilityToDeleteRole(id: number, safeRoleName: string): void {
    const subscription = this.roleService
      .checkPossibilityToDeleteRole(id)
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.deleteRole(id, safeRoleName);
          } else {
            this.showMessage({
              severity: 'warn',
              summary: 'Ошибка',
              detail: `Невозможно удалить роль '${safeRoleName}'. Она назначена пользователям.`,
              sticky: true,
            });
          }
        },
        error: (err) => this.errorService.handle(err),
      });
    this.subscriptions.add(subscription);
  }

  /**
   * Deletes the role via the RoleService.
   * @param id - The role's identifier.
   * @param safeRoleName - The sanitized role name.
   */
  private deleteRole(id: number, safeRoleName: string): void {
    const subscription = this.roleService.deleteRole(id).subscribe({
      next: () => {
        this.showMessage({
          severity: 'success',
          summary: 'Успешно',
          detail: `Роль '${safeRoleName}' удалена`,
        });
        this.loadRoles();
      },
      error: (err) => this.errorService.handle(err),
    });
    this.subscriptions.add(subscription);
  }

  /**
   * Displays a message using the MessageService.
   * @param config - The configuration of the message.
   */
  private showMessage(config: MessageConfig): void {
    this.messageService.add(config);
  }
}
