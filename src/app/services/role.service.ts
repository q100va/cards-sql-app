import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Operation, Role, RoleAccess } from '../interfaces/role';
// Define response interfaces according to your API contract.
interface ApiResponse<T> {
  data: T;
  msg: string;
}
@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);
  private readonly BASE_URL: string = `${environment.apiUrl}/api/roles`;
  // A generic error handling method.
  private handleError(error: HttpErrorResponse) {
    // Here you can log the error to your remote logging infrastructure
    //  console.error('An error occurred:', error);
    // Return an observable with a user-facing error message.
    //return throwError(() => new Error('Something went wrong; please try again later.'));
    return throwError(() => error);
  }
  /**
   * Check if the given role name exists.
   * @param roleName - The name of the role to check.
   * @returns Observable containing the response.
   */
  checkRoleName(roleName: string): Observable<ApiResponse<boolean>> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.BASE_URL}/check-role-name`, {
        roleName,
      })
      .pipe(catchError(this.handleError));
  }
  /**
   * Create a new role with the provided name and description.
   * @param name - Name of the new role.
   * @param description - Description for the new role.
   * @returns Observable containing the response.
   */
  createRole(name: string, description: string): Observable<ApiResponse<string>> {
    return this.http
      .post<ApiResponse<string>>(`${this.BASE_URL}/create-role`, {
        name,
        description,
      })
      .pipe(catchError(this.handleError));
  }
  /**
   * Update an existing role.
   * @param role - The role object with updated details.
   * @returns Observable containing the response.
   */
  updateRole(role: Role): Observable<ApiResponse<Role>> {
    return this.http
      .patch<ApiResponse<Role>>(`${this.BASE_URL}/update-role`, role)
      .pipe(catchError(this.handleError));
  }
  /**
   * Update role access by changing a specific permission (access) for an operation.
   * @param value - New access value (true/false).
   * @param roleId - Identifier of the role.
   * @param operation - Operation details related to the role.
   * @returns Observable containing the response.
   */
  updateRoleAccess(
    value: boolean,
    roleId: number,
    operation: Operation
  ): Observable<ApiResponse<{ object: string; ops: RoleAccess[] }>> {
    return this.http
      .patch<ApiResponse<{ object: string; ops: RoleAccess[] }>>(
        `${this.BASE_URL}/update-role-access`,
        {
          access: value,
          roleId,
          operation,
        }
      )
      .pipe(catchError(this.handleError));
  }
  /**
   * Retrieve a list of all roles.
   * @returns Observable containing the list of roles.
   */
  getRoles(): Observable<
    ApiResponse<{ roles: Role[]; operations: Operation[] }>
  > {
    return this.http
      .get<ApiResponse<{ roles: Role[]; operations: Operation[] }>>(
        `${this.BASE_URL}/get-roles`
      )
      .pipe(catchError(this.handleError));
  }
  /**
   * Retrieve a list of role names.
   * @returns Observable containing the list of role names.
   */
  getRolesNamesList(): Observable<
    ApiResponse<
      {
        id: number;
        name: string;
      }[]
    >
  > {
    return this.http
      .get<
        ApiResponse<
          {
            id: number;
            name: string;
          }[]
        >
      >(`${this.BASE_URL}/get-roles-names-list`)
      .pipe(catchError(this.handleError));
  }
  /**
   * Check if a role can be deleted.
   * @param id - The identifier of the role to be checked.
   * @returns Observable containing the response.
   */
  checkPossibilityToDeleteRole(
    id: number
  ): Observable<ApiResponse<string | null>> {
    return this.http
      .get<ApiResponse<string | null>>(
        `${this.BASE_URL}/check-role-before-delete/${encodeURIComponent(
          id.toString()
        )}`
      )
      .pipe(catchError(this.handleError));
  }
  /**
   * Delete a role by its id.
   * @param id - The identifier of the role to delete.
   * @returns Observable containing the response.
   */
  deleteRole(id: number): Observable<ApiResponse<boolean>> {
    return this.http
      .delete<ApiResponse<boolean>>(
        `${this.BASE_URL}/delete-role/${encodeURIComponent(id.toString())}`
      )
      .pipe(catchError(this.handleError));
  }
}
