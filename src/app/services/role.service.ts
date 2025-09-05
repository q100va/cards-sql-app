import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Schemas & validators
import {
  Operation,
  Role,
  RoleAccess,
  roleSchema,
  roleAccessesSchema,
  rolesListSchema,
  rolesNamesListSchema,
} from '@shared/schemas/role.schema';
import {
  validateNoSchemaResponse,
  validateResponse,
} from '../utils/validate-response';
import { ApiResponse } from '../interfaces/api-response';
import { MessageWrapperService } from './message.service';
import z from 'zod';

@Injectable({ providedIn: 'root' })
export class RoleService {
  // Dependencies
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/api/roles`;

  // HTTP error passthrough (handled by MessageWrapperService at call sites)
  private handleError = (error: HttpErrorResponse) => throwError(() => error);

  constructor(private msgWrapper: MessageWrapperService) {}

  // Check if a role name is already taken.
  checkRoleName(name: string): Observable<ApiResponse<boolean>> {
    return this.http
      .get<ApiResponse<boolean>>(
        `${this.BASE_URL}/check-role-name/${encodeURIComponent(name)}`
      )
      .pipe(
        validateNoSchemaResponse<boolean>('isBoolean'),
        this.msgWrapper.messageTap('warn', {
          source: 'CreateRoleDialog',
          stage: 'checkRoleName',
          nameLen: name.length,
        }),
        catchError(this.handleError)
      );
  }

  // Create a new role.
  createRole(
    name: string,
    description: string
  ): Observable<ApiResponse<string>> {
    return this.http
      .post<ApiResponse<string>>(`${this.BASE_URL}/create-role`, {
        name,
        description,
      })
      .pipe(
        validateNoSchemaResponse<string>('isString'),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          name: res.data,
        })),
        catchError(this.handleError)
      );
  }

  // Update role name/description.
  updateRole(role: Role): Observable<ApiResponse<Role>> {
    return this.http
      .patch<ApiResponse<Role>>(`${this.BASE_URL}/update-role`, role)
      .pipe(
        validateResponse(roleSchema),
        this.msgWrapper.messageTap('success', undefined, (res) => ({
          name: res.data.name,
        })),
        catchError(this.handleError)
      );
  }

  // Toggle access for a specific operation of a role.
  updateRoleAccess(
    value: boolean,
    roleId: number,
    operation: Operation
  ): Observable<ApiResponse<{ object: string; ops: RoleAccess[] }>> {
    return this.http
      .patch<ApiResponse<{ object: string; ops: RoleAccess[] }>>(
        `${this.BASE_URL}/update-role-access`,
        { access: value, roleId, operation }
      )
      .pipe(validateResponse(roleAccessesSchema), catchError(this.handleError));
  }

  // Get roles and operations (for the table).
  getRoles(): Observable<
    ApiResponse<{ roles: Role[]; operations: Operation[] }>
  > {
    return this.http
      .get<ApiResponse<{ roles: Role[]; operations: Operation[] }>>(
        `${this.BASE_URL}/get-roles`
      )
      .pipe(validateResponse(rolesListSchema), catchError(this.handleError));
  }

  // Get id/name pairs for dropdowns.
  getRolesNamesList(): Observable<ApiResponse<{ id: number; name: string }[]>> {
    return this.http
      .get<ApiResponse<{ id: number; name: string }[]>>(
        `${this.BASE_URL}/get-roles-names-list`
      )
      .pipe(
        validateResponse(rolesNamesListSchema),
        catchError(this.handleError)
      );
  }

  // Check if a role can be deleted (returns usernames string or empty).
  checkPossibilityToDeleteRole(id: number): Observable<ApiResponse<number>> {
    return this.http
      .get<ApiResponse<number>>(
        `${this.BASE_URL}/check-role-before-delete/${encodeURIComponent(
          String(id)
        )}`
      )
      .pipe(
        validateNoSchemaResponse<number>('isNumber'),
        this.msgWrapper.messageTap(
          'warn',
          (res) => ({
            source: 'RolesList',
            stage: 'checkPossibilityToDeleteRole',
            roleId: id,
            amountOfUsers: res.data,
          }),
          (res) => ({ count: res.data })
        ),
        catchError(this.handleError)
      );
  }

  // Delete role by id.
  deleteRole(id: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<ApiResponse<null>>(
        `${this.BASE_URL}/delete-role/${encodeURIComponent(String(id))}`
      )
      .pipe(
        validateNoSchemaResponse<null>('isNull'),
        this.msgWrapper.messageTap('success'),
        catchError(this.handleError)
      );
  }
}
