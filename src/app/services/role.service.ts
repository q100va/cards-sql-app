import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);

  constructor() {}

  checkRoleName(roleName: string): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/roles/check-role-name/', {
      data: roleName,
    });
  }
  createRole(name: string, description: string): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.post(BACKEND_URL + '/api/roles/create-role/', {
      data: { name: name, description: description },
    });
  }
  updateRole(role: { [key: string]: string | number}): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.patch(BACKEND_URL + '/api/roles/update-role/', {
      data: { role: role},
    });
  }
  updateRoleAccess(
    value: boolean,
    roleId: number,
    operation: {
      [key: string]: string | boolean | [] | { [key: string]: boolean }[];
    }
  ): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.patch(BACKEND_URL + '/api/roles/update-role-access/', {
      data: { access: value, roleId: roleId, operation: operation },
    });
  }
  getRoles(): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/roles/get-roles');
  }
  getRolesNamesList(): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(BACKEND_URL + '/api/roles/get-roles-names-list');
  }
  checkPossibilityToDeleteRole(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.get(
      BACKEND_URL + '/api/roles/check-role-before-delete/' + id
    );
  }
  deleteRole(id: number): Observable<any> {
    const BACKEND_URL = environment.apiUrl;
    return this.http.delete(BACKEND_URL + '/api/roles/delete-role/' + id);
  }
}
