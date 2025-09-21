// Angular core & RxJS
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { EMPTY } from 'rxjs';
import { finalize, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';

// Forms
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';

// App services, utils, schemas
import { CreateRoleDialogComponent } from './create-role-dialog/create-role-dialog.component';
import { RoleService } from '../../services/role.service';
import { Operation, Role, roleDraftSchema } from '@shared/schemas/role.schema';
import { sanitizeText } from '../../utils/sanitize-text';
import { MessageWrapperService } from '../../services/message.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { RoleAccess } from '../../../../shared/dist/role.schema';
import { HasOpDirective } from '../../directives/has-op.directive';

@Component({
  selector: 'app-roles-list',
  imports: [
    // Material
    MatCardModule,
    MatButtonModule,
    MatGridListModule,
    MatCheckboxModule,
    MatIconModule,
    // Forms
    FormsModule,
    // PrimeNG
    TableModule,
    InputTextModule,
    TranslateModule,
    HasOpDirective
  ],
  providers: [],
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css'],
})
export class RolesListComponent implements OnInit {
  // Dependencies
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dialog = inject(MatDialog);
  private readonly msgWrapper = inject(MessageWrapperService);
  private readonly translateService = inject(TranslateService);

  // UI state
  isLoading = signal<boolean>(false);
  scrollHeight = '800px';
  tableStyle = { 'min-width': '75rem' };

  // Data
  operations!: Operation[];
  roles!: Role[];
  originalRoles!: Role[];

  // Utils & schemas (exposed to template)
  sanitizeText = sanitizeText;
  roleDraftSchema = roleDraftSchema;

  // Lifecycle
  ngOnInit(): void {
    this.loadRoles();
    const height = window.innerHeight * 0.75;
    this.scrollHeight = `${height}px`;
  }

  // Actions: open dialog → create role → reload
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
        }
      });
  }

  // Actions: inline update role (name/description)
  onInputChange(index: number): void {
    // normalize
    this.roles[index].name = this.roles[index].name.trim();
    this.roles[index].description = this.roles[index].description.trim();

    const role = this.roles[index];
    const validName = roleDraftSchema.shape.name.safeParse(role.name).success;
    const validDesc = roleDraftSchema.shape.description.safeParse(
      role.description
    ).success;
    if (!validName || !validDesc) return;

    const originalRole = this.originalRoles[index];
    const nameChanged = originalRole.name !== role.name;
    const descriptionChanged = originalRole.description !== role.description;
    if (!nameChanged && !descriptionChanged) return;

    const updateRole = () =>
      this.roleService
        .updateRole(role)
        .pipe(takeUntilDestroyed(this.destroyRef));

    if (nameChanged) {
      // check uniqueness before update
      this.roleService
        .checkRoleName(role.name)
        .pipe(
          switchMap((res) => {
            if (res.data) {
              this.roles[index] = { ...originalRole };
              return EMPTY;
            }
            return updateRole();
          })
        )
        .subscribe({
          next: (res) => {
            const updatedRole = res.data;
            this.roles[index] = { ...updatedRole };
            this.originalRoles[index] = { ...updatedRole };
          },
          error: (err) => {
            this.roles[index] = { ...originalRole };
            this.msgWrapper.handle(err, {
              source: 'RolesList',
              stage: 'updateRole',
              roleId: role.id,
            });
          },
        });
    } else if (descriptionChanged) {
      // description-only update
      updateRole().subscribe({
        next: (res) => {
          const updatedRole = res.data;
          this.roles[index] = { ...updatedRole };
          this.originalRoles[index] = { ...updatedRole };
        },
        error: (err) => {
          this.roles[index] = { ...originalRole };

          this.msgWrapper.handle(err, {
            source: 'RolesList',
            stage: 'updateRole',
            roleId: role.id,
          });
        },
      });
    }
  }

  // Actions: toggle access for a role's operation
  onAccessChangeCheck(
    value: boolean,
    roleId: number,
    operation: Operation
  ): void {
    this.roleService
      .updateRoleAccess(value, roleId, operation)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          const me = this.authService.getCurrentUserSnapshot();
          if (me?.roleId === roleId) {
            this.authService.fetchPermissions(); // подтянуть /api/auth/permissions
          }
        })
      )
      .subscribe({
        next: (res) => {
          const updatedObject = res.data.object;
          const newOpsForUpdatedRole = res.data.ops;
          const opsMap = new Map(newOpsForUpdatedRole.map((op) => [op.id, op]));

          this.operations
            .filter((op) => op.object === updatedObject)
            .forEach((op) => {
              op.rolesAccesses = op.rolesAccesses.map((roleAccess: RoleAccess) =>
                opsMap.has(roleAccess.id)
                  ? { ...roleAccess, ...opsMap.get(roleAccess.id) }
                  : roleAccess
              );
            });
            console.log(this.operations.filter((op) => op.object === updatedObject));
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'RolesList',
            stage: 'changeAccess',
            roleId: roleId,
            operationName: operation.operationName,
          }),
      });
  }

  // Actions: confirm delete
  onDeleteRoleClick(index: number): void {
    const role = this.roles[index];
    const safeRoleName = this.sanitizeText(role.name);
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'PRIME_CONFIRM.DELETE_ROLE_MESSAGE',
        { name: safeRoleName }
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

      accept: () => this.checkPossibilityToDeleteRole(role.id),
    });
  }

  // Private: check role usage before delete
  private checkPossibilityToDeleteRole(
    id: number /* , roleName: string */
  ): void {
    this.roleService
      .checkPossibilityToDeleteRole(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (!res.data) {
            this.deleteRole(id);
          }
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'RolesList',
            stage: 'checkPossibilityToDeleteRole',
            roleId: id,
          }),
      });
  }

  // Private: delete role
  private deleteRole(id: number /* , roleName: string */): void {
    this.roleService
      .deleteRole(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadRoles();
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'RolesList',
            stage: 'deleteRole',
            roleId: id,
          }),
      });
  }

  // Private: load roles & operations
  private loadRoles(): void {
    this.isLoading.set(true);
    this.roleService
      .getRoles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.roles = res.data.roles;
          this.originalRoles = structuredClone(this.roles);
          this.operations = res.data.operations;
        },
        error: (err) =>
          this.msgWrapper.handle(err, {
            source: 'RolesList',
            stage: 'loadRoles',
          }),
      });
  }
}
