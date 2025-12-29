import { Params } from '../../directives/has-op.directive';


export type TableComponentType = 'user' | 'partner' | 'volunteer';


type PermissionKeysByKind = {
  user:
    | 'viewOrEdit'
    | 'viewVolunteers'
    | 'viewOrders'
    | 'block'
    | 'unblock'
    | 'delete';

  partner:
    | 'viewOrEdit'
    | 'viewHomes'
    | 'block'
    | 'unblock'
    | 'delete';

  volunteer:
    | 'viewOrEdit'
    | 'viewSeniors'
    | 'viewUsers'
    | 'viewOrders'
    | 'block'
    | 'unblock'
    | 'delete';
};

export type PermissionSet<K extends TableComponentType> = {
  readonly [A in PermissionKeysByKind[K]]: Params;
};

export type PermissionsComponentRegistry = {
  readonly [K in TableComponentType]: PermissionSet<K>;
};
/* export type PermissionsComponentRegistry = {
  readonly [K in TableComponentType]: PermissionSet;
}; */
export const PERMISSIONS_COMPONENT_REGISTRY: PermissionsComponentRegistry = {
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
    viewVolunteers: {
      codes: ['VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST'],
      mode: 'any',
    },
    viewOrders: {
      codes: ['VIEW_LIMITED_ORDERS_LIST', 'VIEW_FULL_ORDERS_LIST'],
      mode: 'any',
    },
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
    viewHomes: {
      codes: ['VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'],
      mode: 'any',
    },
  },
  volunteer: {
    viewOrEdit: {
      codes: ['VIEW_VOLUNTEER', 'EDIT_VOLUNTEER'],
      mode: 'any',
    },
    block: {
      codes: ['BLOCK_VOLUNTEER'],
      mode: 'any',
    },
    unblock: {
      codes: ['UNBLOCK_VOLUNTEER'],
      mode: 'any',
    },
    delete: {
      codes: ['DELETE_VOLUNTEER'],
      mode: 'any',
    },
    viewOrders: {
      codes: ['VIEW_LIMITED_ORDERS_LIST', 'VIEW_FULL_ORDERS_LIST'],
      mode: 'any',
    },
    viewSeniors: {
      codes: ['VIEW_LIMITED_SENIORS_LIST', 'VIEW_FULL_SENIORS_LIST'],
      mode: 'any',
    },
    viewUsers: {
      codes: ['VIEW_LIMITED_USERS_LIST', 'VIEW_FULL_USERS_LIST'],
      mode: 'any',
    },
  },
  // ...
} as const;
