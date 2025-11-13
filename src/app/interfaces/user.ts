import { Address, AdvancedModel } from './advanced-model';
import type {
  UserDuplicates,
  //UserDraft,
  UserContacts,
  UserOutdatedData,
  ChangePassword,
  UserOutdatingData,
  UserChangingData,
  OutdatedUserName,
  UserDraftContacts
} from '@shared/schemas/user.schema';


export type {
  UserDuplicates,
  //UserDraft,
  UserContacts,
  UserOutdatedData,
  ChangePassword,
  UserOutdatingData,
  UserChangingData,
  OutdatedUserName,
  UserDraftContacts
};

export interface User extends AdvancedModel {
  id: number;
  userName: string;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  roleId: number;
  roleName: string;
  address: Address;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  orderedContacts: UserContacts;
  outdatedData: UserOutdatedData;
}
