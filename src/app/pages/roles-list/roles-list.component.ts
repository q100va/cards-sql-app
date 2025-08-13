import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { EMPTY } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { ConfirmationService } from 'primeng/api';
// Application imports
import { CreateRoleDialogComponent } from './create-role-dialog/create-role-dialog.component';
import { RoleService } from '../../services/role.service';
import { Operation, Role } from '@shared/schemas/role.schema';
import { trackById } from '../../utils/track-by-id.util';
import { sanitizeText } from '../../utils/sanitize-text';
import { MessageWrapperService } from '../../services/message.service';
// Imports for zod validation by schema
import { roleDraftSchema } from '@shared/schemas/role.schema';

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
  ],
  providers: [],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css'],
})
export class RolesListComponent implements OnInit {
  // Public properties
  operations!: Operation[];
  roles!: Role[];
  originalRoles!: Role[];
  isLoading = signal<boolean>(false);
  tableStyle = { 'min-width': '75rem' };
  trackById = trackById;
  sanitizeText = sanitizeText;
  scrollHeight = '800px';
  roleDraftSchema = roleDraftSchema;

  // Private properties
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dialog = inject(MatDialog);
  private readonly msgWrapper = inject(MessageWrapperService);

  // Lifecycle hooks
  ngOnInit(): void {
    this.loadRoles();
    const height = window.innerHeight * 0.75;
    this.scrollHeight = `${height}px`;
    console.log(' this.scrollHeight', this.scrollHeight);
  }

  // Public methods

  /**
   * Opens the Add Role dialog and handles the adding process.
   */
  onAddRoleClick(): void {
    const dialogRef = this.dialog.open(CreateRoleDialogComponent, {
      disableClose: true,
      minWidth: '400px',
      height: 'auto',
    });
    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roleName) => {
        if (roleName) {
          this.loadRoles();
          this.msgWrapper.success(`Роль '${roleName}' создана.`);
        }
      });
  }

  /**
   * Handles input change events for updating a role.
   * @param index - The index of the role in the roles array.
   */
  onInputChange(index: number): void {
    // Remove any extra whitespace from the role's name and description.
    this.roles[index].name = this.roles[index].name.trim();
    this.roles[index].description = this.roles[index].description.trim();
    // Get the updated role from the roles array.
    const role = this.roles[index];
    // Exit if the role's name or description is not valid.
    if (
      !roleDraftSchema.shape.name.safeParse(role.name).success ||
      !roleDraftSchema.shape.description.safeParse(role.description).success
    ) {
      return;
    }
    // Retrieve the original copy of the role for change comparison.
    const originalRole = this.originalRoles[index];
    // Determine if the name or description has changed.
    const nameChanged = originalRole.name !== role.name;
    const descriptionChanged = originalRole.description !== role.description;
    // If neither the name nor the description changed, no update is needed.
    if (!nameChanged && !descriptionChanged) {
      return; // nothing changed
    }
    // Helper function that performs the role update.
    const updateRole = () =>
      this.roleService
        .updateRole(role)
        .pipe(takeUntilDestroyed(this.destroyRef));
    // If the role's name has been changed, check if the new name is already taken.
    if (nameChanged) {
      this.roleService
        .checkRoleName(role.name)
        .pipe(
          switchMap((res) => {
            if (res.data) {
              // Warn the user if the new name is already in use.
              this.msgWrapper.warn(
                `Название '${role.name}' уже занято! Выберите другое.`
              );
              // Rollback changes to the original role.
              this.roles[index] = { ...originalRole };
              return EMPTY;
            } else {
              // If the name is unique, proceed to update the role.
              return updateRole();
            }
          })
        )
        .subscribe({
          next: (res) => {
            // Once updated, notify the user and refresh both the roles and originalRoles arrays.
            const updatedRole = res.data;
            this.msgWrapper.success(`Роль '${updatedRole.name}' обновлена.`);
            this.roles[index] = { ...updatedRole };
            this.originalRoles[index] = { ...updatedRole };
          },
          error: (err) => {
            this.roles[index] = { ...originalRole };
            this.msgWrapper.handle(err);
          },
        });
    } else if (descriptionChanged) {
      // If only the description has changed, update without checking the name.
      updateRole().subscribe({
        next: (res) => {
          // Once updated, notify the user and refresh both the roles and originalRoles arrays.
          const updatedRole = res.data;
          this.msgWrapper.success(`Роль '${updatedRole.name}' обновлена.`);
          this.roles[index] = { ...updatedRole };
          this.originalRoles[index] = { ...updatedRole };
        },
        error: (err) => {
          this.roles[index] = { ...originalRole };
          this.msgWrapper.handle(err);
        },
      });
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
    this.roleService
      .updateRoleAccess(value, roleId, operation)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const updatedObject = res.data.object;
          const newOpsForUpdatedRole = res.data.ops;
          console.log('newOpsForUpdatedRole', newOpsForUpdatedRole);
          const opsMap = new Map(newOpsForUpdatedRole.map((op) => [op.id, op]));
          this.operations
            .filter((op) => op.object === updatedObject)
            .forEach((op) => {
              op.rolesAccesses = op.rolesAccesses.map((roleAccess) =>
                opsMap.has(roleAccess.id)
                  ? { ...roleAccess, ...opsMap.get(roleAccess.id) }
                  : roleAccess
              );
            });
        },
        error: (err) => this.msgWrapper.handle(err),
      });
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

  /**
   * Checks if a role can be safely deleted.
   * @param id - The role's identifier.
   * @param safeRoleName - The sanitized role name.
   */
  private checkPossibilityToDeleteRole(id: number, roleName: string): void {
    this.roleService
      .checkPossibilityToDeleteRole(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (!res.data) {
            this.deleteRole(id, roleName);
          } else {
            this.msgWrapper.warn(
              `Невозможно удалить роль '${roleName}'. Она назначена пользователям: '${res.data}'.`
            );
          }
        },
        error: (err) => this.msgWrapper.handle(err),
      });
  }

  /**
   * Deletes the role via the RoleService.
   * @param id - The role's identifier.
   * @param safeRoleName - The sanitized role name.
   */
  private deleteRole(id: number, roleName: string): void {
    this.roleService
      .deleteRole(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgWrapper.success(`Роль '${roleName}'удалена.`);
          this.loadRoles();
        },
        error: (err) => this.msgWrapper.handle(err),
      });
  }

  /**
   * Loads roles and operations from the RoleService.
   */
  private loadRoles(): void {
    this.isLoading.set(true);
    this.roleService
      .getRoles()
      .pipe(
        // Ensure loading indicator is deactivated after the call completes
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.roles = res.data.roles;
          this.originalRoles = structuredClone(this.roles);
          this.operations = res.data.operations;
          console.log('this.operations', this.operations);
        },
        error: (err) => this.msgWrapper.handle(err),
      });
  }
}
