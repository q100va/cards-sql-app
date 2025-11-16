import { BaseModel } from './base-model';
import {
  // User,
  UserContacts,
  OutdatedUserName,
  //UserChangingData,
  // UserOutdatingData,
} from './user';
import {
  OutdatedHome,
  // Partner,
  //PartnerChangingData,
  // PartnerOutdatingData,
} from './partner';

import type {
  Contact,
  Address,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  OptionalContacts,
  BaseOutdatedData,
  DraftAddress,
  Duplicates,
} from '@shared/schemas/common.schema';
import { Client } from './client';

export type {
  Address,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  OptionalContacts,
  BaseOutdatedData,
  Duplicates,
};

export interface AdvancedModel extends BaseModel {
  address: Address;
  comment: string | null;
  orderedContacts: UserContacts | OptionalContacts;
  outdatedData: UserOutdatedData | PartnerOutdatedData;
}

export type Kind = 'user' | 'partner'; // | 'client'
//export type Owner = User | Partner; // | Client
export type OwnerDraft = UserDraft | PartnerDraft; // | ClientDraft
export type OwnerContacts = UserContacts | OptionalContacts;
//export type OwnerOutdatedData = UserOutdatedData | PartnerOutdatedData;

type RestoreCommonKey = 'addresses' | 'names' | 'contacts';

export type BaseRestoringData = {
  addresses: number[] | null;
  names: number[] | null;
  contacts: Partial<Record<ContactType, Contact[]>> | null;
};
export type UserRestoringData = BaseRestoringData & {
  userNames: number[] | null;
};
export type PartnerRestoringData = BaseRestoringData & {
  homes: number[] | null;
};

export type BaseDeletingData = {
  addresses: number[] | null;
  names: number[] | null;
  contacts: number[] | null;
};
export type UserDeletingData = BaseDeletingData & {
  userNames: number[] | null;
};
export type PartnerDeletingData = BaseDeletingData & { homes: number[] | null };

export type UserOutdatedData = BaseOutdatedData & {
  userNames: OutdatedUserName[];
};
export type PartnerOutdatedData = BaseOutdatedData & {
  homes: OutdatedHome[];
};

export type BaseChangingMain = {
  firstName?: string;
  patronymic?: string | null;
  lastName?: string | null;
  comment?: string | null;

  isRestricted?: boolean;
  causeOfRestriction?: string | null;
  dateOfRestriction?: Date | null;
};
export type BaseChangingData<M extends BaseChangingMain = BaseChangingMain> = {
  main: M | null;
  address: DraftAddress | null;
  contacts: Partial<Record<ContactType, string[]>> | null;
};
export type UserChangingMain = BaseChangingMain & {
  userName?: string;
  roleId?: number;
};
export type UserChangingData = BaseChangingData<UserChangingMain>;
export type PartnerChangingMain = BaseChangingMain & {
  affiliation?: string; // можешь заменить на union из трёх ключей enum’а
  position?: string | null;
};
export type PartnerChangingData = BaseChangingData<PartnerChangingMain>;

export type BaseOutdatingNames = {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};
export type BaseOutdatingData = {
  address: number | null;
  names: BaseOutdatingNames | null;
  contacts: number[] | null;
};
export type UserOutdatingData = BaseOutdatingData & {
  userName: string | null;
};
export type PartnerOutdatingData = BaseOutdatingData & {
  homes: number[] | null;
};

export type OwnerChangingData = UserChangingData | PartnerChangingData;
export type OwnerOutdatingData = UserOutdatingData | PartnerOutdatingData;
export type OwnerDeletingData = UserDeletingData | PartnerDeletingData;
export type OwnerRestoringData = UserRestoringData | PartnerRestoringData;

type ItemOf<T> = T extends (infer U)[] ? U : never;

const contactTypeMap = {
  email: true,
  phoneNumber: true,
  whatsApp: true,
  telegram: true,
  telegramNickname: true,
  telegramId: true,
  telegramPhoneNumber: true,
  vKontakte: true,
  instagram: true,
  facebook: true,
  otherContact: true,
} as const;
export type ContactType = keyof typeof contactTypeMap;
export type NonTelegram = Exclude<ContactType, 'telegram'>;
export function isContactType(value: string): value is ContactType {
  return value in contactTypeMap;
}

export type DraftCommon = {
  id: number | null;
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  draftAddress: DraftAddress;
  draftContacts: Record<NonTelegram, string[]>;
};

export type UserDraft = DraftCommon & {
  userName: string;
  password: string;
  roleId: number;
};

export type PartnerDraft = DraftCommon & {
  affiliation: string;
  position: string | null;
};

export type ClientDraft = DraftCommon & {
  displayName: string | null;
};

export type Owner = {
  id: number;
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  address: Address;
  orderedContacts: OptionalContacts;
  outdatedData: BaseOutdatedData;
};

export type User = Owner & {
  userName: string;
  lastName: string;
  roleId: number;
  roleName: string;
  orderedContacts: UserContacts;
  outdatedData: UserOutdatedData;
};
export type Partner = Owner & {
  affiliation: string;
  position: string | null;
  outdatedData: PartnerOutdatedData;
  homes: OutdatedHome[] | null;
};
