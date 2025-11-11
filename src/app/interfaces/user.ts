import { Address, AdvancedModel } from './advanced-model';
import type {
  UserDuplicates,
  UserDraft,
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
  UserDraft,
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
  //password: string;
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

//export type CommonUserFields = keyof NonNullable<UserChangingData['main']>;
//export type UserRestoringDataType = keyof UserRestoringData;
//export type UserDeletingDataType = keyof UserDeletingData;

/* export interface OutdatingData {
  address: number | null;
  names: {
    firstName: string;
    patronymic: string | null;
    lastName: string;
  } | null;
  userName: string | null;
  contacts: number[] | null;
}

export interface DeletingData {
  userNames: number[] | null;
  names: number[] | null;
  addresses: number[] | null;
  contacts: number[] | null;
}

export interface ChangingData {
  main: {
    firstName?: string;
    patronymic?: string | null;
    lastName?: string;
    userName?: string;
    roleId?: number;
    comment?: string | null;
    isRestricted?: boolean;
    causeOfRestriction?: string | null;
    dateOfRestriction?: Date | null;
  } | null;
  address: {
    countryId: number | null;
    regionId: number | null;
    districtId: number | null;
    localityId: number | null;
  } | null;
  contacts: {
    email?: string[];
    phoneNumber?: string[];
    whatsApp?: string[];
    telegramNickname?: string[];
    telegramId?: string[];
    telegramPhoneNumber?: string[];
    vKontakte?: string[];
    instagram?: string[];
    facebook?: string[];
    otherContact?: string[];
  } | null;
} */

/* export interface RestoringData {
  addresses: number[] | null;
  names: number[] | null;
  userNames: number[] | null;
  contacts: {
    email?: Contact[];
    phoneNumber?: Contact[];
    whatsApp?: Contact[];
    telegramNickname?: Contact[];
    telegramId?: Contact[];
    telegramPhoneNumber?: Contact[];
    vKontakte?: Contact[];
    instagram?: Contact[];
    facebook?: Contact[];
    otherContact?: Contact[];
  } | null;
}*/

/* export interface UserDraft {
  id: number | null;
  userName: string;
  password: string;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  roleId: number;
  //role: { name: string };

  draftAddress: {
    countryId: number | null;
    regionId: number | null;
    districtId: number | null;
    localityId: number | null;
  };
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  draftContacts: {
    email: string[];
    phoneNumber: string[];
    whatsApp: string[];
    telegramNickname: string[];
    telegramId: string[];
    telegramPhoneNumber: string[];
    vKontakte: string[];
    instagram: string[];
    facebook: string[];
    otherContact: string[];
  }
} */

/* export interface OutdatedData {
  contacts: Contacts;
  addresses: {
    country: { id: number; name: string };
    region: { id: number; shortName: string } | null;
    district: { id: number; shortName: string } | null;
    locality: { id: number; shortName: string } | null;
    id: number;
  }[];
  names: {
    firstName: string | null;
    patronymic: string | null;
    lastName: string | null;
    id: number;
  }[];
  userNames: {
    userName: string | null;
    id: number;
  }[];
}
 */
/* export interface Contact {
  id: number;
  content: string;
}
export interface Contacts {
  email: Contact[];
  phoneNumber: Contact[];
  whatsApp: Contact[];
  telegram: Contact[];
  telegramNickname: Contact[];
  telegramId: Contact[];
  telegramPhoneNumber: Contact[];
  vKontakte: Contact[];
  instagram: Contact[];
  facebook: Contact[];
  otherContact: Contact[];
} */
