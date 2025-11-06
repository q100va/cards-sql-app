import { Params } from '../../../../directives/has-op.directive';
import { ToponymDetailsComponent } from '../../../../pages/toponym-details/toponym-details.component';
import { UserDetailsComponent } from '../../../../pages/user-details/user-details.component';

export const DETAILS_COMPONENT_REGISTRY = {
  user: UserDetailsComponent,
  toponym: ToponymDetailsComponent,
  // ...
} as const;

export type DetailsComponentType = keyof typeof DETAILS_COMPONENT_REGISTRY;

type PermissionSet = {
  readonly [A in 'edit' | 'createOrEdit']: Params;
};
export type PermissionsComponentRegistry = {
  readonly [K in DetailsComponentType]: PermissionSet;
};

export const PERMISSIONS_COMPONENT_REGISTRY = {
  user: {
    edit: {
      codes: ['EDIT_USER'],
      mode: 'all',
    },
    createOrEdit: {
      codes: ['ADD_NEW_USER', 'EDIT_USER'],
      mode: 'any',
    },
  },
  toponym: {
    edit: {
      codes: ['EDIT_TOPONYM'],
      mode: 'all',
    },
    createOrEdit: {
      codes: ['ADD_NEW_TOPONYM', 'EDIT_TOPONYM'],
      mode: 'any',
    },
  },
  // ...
}satisfies PermissionsComponentRegistry;
