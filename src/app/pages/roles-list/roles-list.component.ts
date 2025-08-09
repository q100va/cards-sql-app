import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
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
import { Toast, ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
// Application imports
import { CreateRoleDialogComponent } from './create-role-dialog/create-role-dialog.component';
import { RoleService } from '../../services/role.service';
import { ErrorService } from '../../services/error.service';
import { Operation, Role } from '../../interfaces/role';
import { trackById } from '../../utils/track-by-id.util';
import { sanitizeText } from '../../utils/sanitize-text';
import { MessageWrapperService } from '../../services/message.service';

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
  sanitizeText = sanitizeText;
  scrollHeight = '800px';

  // Private properties
  private readonly subscriptions = new Subscription();
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dialog = inject(MatDialog);
  protected readonly errorService = inject(ErrorService);
  private readonly msgWrapper = inject(MessageWrapperService);

  // Lifecycle hooks
  ngOnInit(): void {
    this.loadRoles();
    const height = window.innerHeight * 0.75;
    this.scrollHeight = `${height}px`;
    console.log(' this.scrollHeight', this.scrollHeight);
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
        this.msgWrapper.success(`Роль '${result.roleName}' создана.`);
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
          const roleName = role.name;
          this.msgWrapper.success(`Роль '${roleName}' обновлена.`);
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
      accept: () => this.checkPossibilityToDeleteRole(role.id, role.name),
    });
  }

  // Private methods

  //TODO: перечислить пользователей!
  /**
   * Checks if a role can be safely deleted.
   * @param id - The role's identifier.
   * @param safeRoleName - The sanitized role name.
   */
  private checkPossibilityToDeleteRole(id: number, roleName: string): void {
    const subscription = this.roleService
      .checkPossibilityToDeleteRole(id)
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.deleteRole(id, roleName);
          } else {
            this.msgWrapper.warn(
              `Невозможно удалить роль '${roleName}'. Она назначена пользователям.`
            );
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
  private deleteRole(id: number, roleName: string): void {
    const subscription = this.roleService.deleteRole(id).subscribe({
      next: () => {
        this.msgWrapper.success(`Роль '${roleName}'удалена.`);
        this.loadRoles();
      },
      error: (err) => this.errorService.handle(err),
    });
    this.subscriptions.add(subscription);
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
}
