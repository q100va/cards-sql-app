//src\app\shared\base-list\base-list-component-registry.ts

import { Params } from '../../directives/has-op.directive';
import { FilterComponentSource } from '../../interfaces/base-list';

export type PermissionSet = {
  readonly [A in 'downloadTable' | 'create']: Params;
};

export type PermissionsComponentRegistry = Partial<Record<FilterComponentSource, PermissionSet>>;

export const PERMISSIONS_COMPONENT_REGISTRY: PermissionsComponentRegistry  = {
  userList: {
    create: {
      codes: ['ADD_NEW_USER'],
      mode: 'all',
    },
    downloadTable: {
      codes: ['DOWNLOAD_USERS_TABLE'],
      mode: 'any',
    },
  },
   partnerList: {
    create: {
      codes: ['ADD_NEW_PARTNER'],
      mode: 'all',
    },
    downloadTable: {
      codes: ['DOWNLOAD_PARTNERS_TABLE'],
      mode: 'any',
    },
  },
  // ...
};
