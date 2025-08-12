import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { RoleService } from './role.service';
import { environment } from '../../environments/environment';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
describe('RoleService', () => {
  let service: RoleService;
  let httpMock: HttpTestingController;
  const BASE_URL = `${environment.apiUrl}/api/roles`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RoleService,
        provideHttpClient(),        // Provides HttpClient in the DI system
        provideHttpClientTesting(), // New provider for HttpClient testing
      ],
    });
    service = TestBed.inject(RoleService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    httpMock.verify();
  });
  // Test for checkRoleName
  describe('checkRoleName', () => {
    it('should return true when a valid role name exists (positive scenario)', () => {
      const roleName = 'Admin';
      const mockResponse = { data: true, msg: 'Valid role name' };
      service.checkRoleName(roleName).subscribe((response) => {
        expect(response.data).toBeTrue();
        expect(response.msg).toBe('Valid role name');
      });
      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-name/${encodeURIComponent(roleName)}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
    it('should handle error when checkRoleName fails (negative scenario)', () => {
      const roleName = 'UnknownRole';
      service.checkRoleName(roleName).subscribe({
        next: () => fail('Expected an error, but got a success response'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(404);
        },
      });
      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-name/${encodeURIComponent(roleName)}`
      );
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });
  // Test for createRole
  describe('createRole', () => {
    it('should successfully create a role (positive scenario)', () => {
      const name = 'User';
      const description = 'Regular user role';
      const mockResponse = {
        data: 'Role created successfully',
        msg: 'Created',
      };
      service.createRole(name, description).subscribe((response) => {
        expect(response.data).toBe('Role created successfully');
        expect(response.msg).toEqual('Created');
      });
      const req = httpMock.expectOne(`${BASE_URL}/create-role`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name, description });
      req.flush(mockResponse);
    });
    it('should handle server error when creating a role (negative scenario)', () => {
      const name = 'User';
      const description = 'Regular user role';
      service.createRole(name, description).subscribe({
        next: () => fail('Expected error when role creation fails'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/create-role`);
      req.flush('Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });
  });
  // Test for updateRole
  describe('updateRole', () => {
    it('should update the role successfully (positive scenario)', () => {
      const role = { id: 1, name: 'Admin', description: 'Administrator' };
      const mockResponse = { data: role, msg: 'Updated' };
      service.updateRole(role).subscribe((response) => {
        expect(response.data).toEqual(role);
        expect(response.msg).toEqual('Updated');
      });
      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(role);
      req.flush(mockResponse);
    });
    it('should handle error when updateRole fails (negative scenario)', () => {
      const role = { id: 1, name: 'Admin', description: 'Administrator' };
      service.updateRole(role).subscribe({
        next: () => fail('Expected an error when updating the role'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(400);
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/update-role`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });
  // Test for updateRoleAccess
  describe('updateRoleAccess', () => {
    it('should update role access successfully (positive scenario)', () => {
      const value = true;
      const roleId = 2;
      const operation = {
        description:
          'полный доступ ко всем операциям с данными жителей интернатов',
        fullAccess: true,
        object: 'seniors',
        objectName: 'жители\nинтернатов',
        operation: 'FULL_ACCESS_SENIORS',
        operationName: 'полный доступ ко всем операциям',
        rolesAccesses: [
          { id: 42, roleId: 1, access: true, disabled: false },
          { id: 93, roleId: 2, access: true, disabled: false },
          { id: 144, roleId: 3, access: false, disabled: false },
          { id: 603, roleId: 12, access: false, disabled: false },
        ],
      }; // an example operation object
      const mockResponse = {
        data: { object: 'Role', ops: [] },
        msg: 'Access Updated',
      };
      service
        .updateRoleAccess(value, roleId, operation)
        .subscribe((response) => {
          expect(response.data.object).toBe('Role');
          expect(response.data.ops).toEqual([]);
          expect(response.msg).toEqual('Access Updated');
        });
      const req = httpMock.expectOne(`${BASE_URL}/update-role-access`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ access: value, roleId, operation });
      req.flush(mockResponse);
    });
    it('should handle error when updating role access (negative scenario)', () => {
      const value = false;
      const roleId = 2;
      const operation = {
        description:
          'полный доступ ко всем операциям с данными жителей интернатов',
        fullAccess: true,
        object: 'seniors',
        objectName: 'жители\nинтернатов',
        operation: 'FULL_ACCESS_SENIORS',
        operationName: 'полный доступ ко всем операциям',
        rolesAccesses: [
          { id: 42, roleId: 1, access: true, disabled: false },
          { id: 93, roleId: 2, access: true, disabled: false },
          { id: 144, roleId: 3, access: false, disabled: false },
          { id: 603, roleId: 12, access: false, disabled: false },
        ],
      };
      service.updateRoleAccess(value, roleId, operation).subscribe({
        next: () => fail('Expected error when updating role access'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(403);
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/update-role-access`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });
  // Test for getRoles
  describe('getRoles', () => {
    it('should retrieve roles and operations successfully (positive scenario)', () => {
      const mockRoles = [
        { id: 1, name: 'Admin', description: 'Administrator' },
        { id: 2, name: 'User', description: 'Regular user' },
      ];
      const mockOperations = [
        {
          description:
            'полный доступ ко всем операциям с данными жителей интернатов',
          fullAccess: true,
          object: 'seniors',
          objectName: 'жители\nинтернатов',
          operation: 'FULL_ACCESS_SENIORS',
          operationName: 'полный доступ ко всем операциям',
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 93, roleId: 2, access: true, disabled: false },
            { id: 144, roleId: 3, access: false, disabled: false },
            { id: 603, roleId: 12, access: false, disabled: false },
          ],
        },
        {
          description:
            'полный доступ ко всем операциям с данными жителей интернатов',
          fullAccess: true,
          object: 'seniors',
          objectName: 'жители\nинтернатов',
          operation: 'FULL_ACCESS_SENIORS',
          operationName: 'полный доступ ко всем операциям',
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 93, roleId: 2, access: true, disabled: false },
            { id: 144, roleId: 3, access: false, disabled: false },
            { id: 603, roleId: 12, access: false, disabled: false },
          ],
        },
      ];
      const mockResponse = {
        data: { roles: mockRoles, operations: mockOperations },
        msg: 'Fetched',
      };
      service.getRoles().subscribe((response) => {
        expect(response.data.roles).toEqual(mockRoles);
        expect(response.data.operations).toEqual(mockOperations);
        expect(response.msg).toEqual('Fetched');
      });
      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
    it('should handle error when fetching roles (negative scenario)', () => {
      service.getRoles().subscribe({
        next: () => fail('Expected error when fetching roles'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/get-roles`);
      req.flush('Server Error Occurred', {
        status: 500,
        statusText: 'Server Error',
      });
    });
  });
  // Test for getRolesNamesList
  describe('getRolesNamesList', () => {
    it('should retrieve a list of role names successfully (positive scenario)', () => {
      const mockData = [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'User' },
      ];
      const mockResponse = { data: mockData, msg: 'Fetched Names' };
      service.getRolesNamesList().subscribe((response) => {
        expect(response.data).toEqual(mockData);
        expect(response.msg).toEqual('Fetched Names');
      });
      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
    it('should handle error when fetching role names (negative scenario)', () => {
      service.getRolesNamesList().subscribe({
        next: () => fail('Expected an error'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(404);
        },
      });
      const req = httpMock.expectOne(`${BASE_URL}/get-roles-names-list`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });
  // Test for checkPossibilityToDeleteRole
  describe('checkPossibilityToDeleteRole', () => {
    it('should verify the possibility to delete a role (positive scenario)', () => {
      const id = 1;
      const mockResponse = {
        data: '',
        msg: 'Check successful',
      };
      service.checkPossibilityToDeleteRole(id).subscribe((response) => {
        expect(response.data).toEqual('');
        expect(response.msg).toEqual('Check successful');
      });
      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(
          id.toString()
        )}`
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
    it('should handle error when checking possibility to delete role (negative scenario)', () => {
      const id = 1;
      service.checkPossibilityToDeleteRole(id).subscribe({
        next: () => fail('Expected error when checking deletion possibility'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(400);
        },
      });
      const req = httpMock.expectOne(
        `${BASE_URL}/check-role-before-delete/${encodeURIComponent(
          id.toString()
        )}`
      );
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });
  });
  // Test for deleteRole
  describe('deleteRole', () => {
    it('should delete a role successfully (positive scenario)', () => {
      const id = 1;
      const mockResponse = { data: true, msg: 'Role deleted' };
      service.deleteRole(id).subscribe((response) => {
        expect(response.data).toBeTrue();
        expect(response.msg).toEqual('Role deleted');
      });
      const req = httpMock.expectOne(
        `${BASE_URL}/delete-role/${encodeURIComponent(id.toString())}`
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
    it('should handle error when deleting a role (negative scenario)', () => {
      const id = 1;
      service.deleteRole(id).subscribe({
        next: () => fail('Expected error when deleting a role'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
        },
      });
      const req = httpMock.expectOne(
        `${BASE_URL}/delete-role/${encodeURIComponent(id.toString())}`
      );
      req.flush('Deletion error', { status: 500, statusText: 'Server Error' });
    });
  });
});
