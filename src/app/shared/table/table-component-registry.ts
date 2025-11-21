import { Params } from '../../directives/has-op.directive';
import { UsersListComponent } from '../../pages/users-list/users-list.component';
//pages/users-list/users-list.component';

export const DETAILS_COMPONENT_REGISTRY = {
  user: UsersListComponent,
  partner: UsersListComponent,
  // ...
} as const;

export type DetailsComponentType = keyof typeof DETAILS_COMPONENT_REGISTRY;

export type PermissionSet = {
  readonly [A in 'viewOrEdit' | 'viewVolunteers' | 'viewHomes' | 'viewOrders' | 'block' | 'unblock' | 'delete']: Params;
};
export type PermissionsComponentRegistry = {
  readonly [K in DetailsComponentType]: PermissionSet;
};
export const PERMISSIONS_COMPONENT_REGISTRY = {
  user: {
    viewOrEdit: {
      codes: ['VIEW_USER', 'EDIT_USER'],
      mode: 'any',
    },
    block: {
      codes: ['BLOCK_USER'],
      mode: 'any',
    },
    unblock: {
      codes: ['UNBLOCK_USER'],
      mode: 'any',
    },
    delete: {
      codes: ['DELETE_USER'],
      mode: 'any',
    },
    viewVolunteers:{
      codes:['VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST'],
      mode: 'any',
    },
    viewHomes:{
      codes:['VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'],
      mode: 'any',
    },
    viewOrders:{
      codes:['VIEW_LIMITED_ORDERS_LIST', 'VIEW_FULL_ORDERS_LIST'],
      mode: 'any',
    }
  },
    partner: {
    viewOrEdit: {
      codes: ['VIEW_PARTNER', 'EDIT_PARTNER'],
      mode: 'any',
    },
    block: {
      codes: ['BLOCK_PARTNER'],
      mode: 'any',
    },
    unblock: {
      codes: ['UNBLOCK_PARTNER'],
      mode: 'any',
    },
    delete: {
      codes: ['DELETE_PARTNER'],
      mode: 'any',
    },
    viewVolunteers:{
      codes:['VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST'],
      mode: 'any',
    },
    viewHomes:{
      codes:['VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'],
      mode: 'any',
    },
    viewOrders:{
      codes:['VIEW_LIMITED_ORDERS_LIST', 'VIEW_FULL_ORDERS_LIST'],
      mode: 'any',
    }
  },
  // ...
}satisfies PermissionsComponentRegistry;
