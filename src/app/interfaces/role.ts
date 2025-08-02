export interface Role {
  id: number;
  name: string;
  access?: boolean;
  description: string;
}

export interface Operation {
  description: string;
  fullAccess: boolean;
  object: string;
  objectName: string;
  operation: string;
  operationName: string;
  roles: Role[];
}
