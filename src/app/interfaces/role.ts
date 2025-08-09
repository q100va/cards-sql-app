/**
 * Represents a user role with its identification and description.
 */
export interface Role {
  id: number;               // Unique identifier for the role
  name: string;             // The name of the role
  description: string;      // A detailed description of the role
}
/**
 * Represents the access settings for a given role.
 */
export interface RoleAccess {
  id: number;               // Unique identifier for the role access setting
  roleId: number;           // Unique identifier for the associated role
  access: boolean;          // Specifies if the role has the required access
  disabled: boolean;        // Determines if the possibility to change this option access is disabled
}
/**
 * Represents an operation including its metadata and role-specific access settings.
 */
export interface Operation {
  description: string;        // Purpose or explanation of the operation
  fullAccess: boolean;        // Indicates whether access for this operation provides full access for all related operations
  object: string;             // Identifier for the related object involved in the operation
  objectName: string;         // Human-readable name of the related object
  operation: string;          // Identifier for the specific operation to be performed
  operationName: string;      // Human-readable name for the operation
  rolesAccesses: RoleAccess;  // Role-specific access settings for the operation
  flag?: 'LIMITED' | 'FULL';  // Additional flag or indicator for the operation
}
