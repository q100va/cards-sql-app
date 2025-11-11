import { BaseModel } from './base-model';
import {
  User,
  UserContacts,
  OutdatedUserName,
  UserDraft,
  UserChangingData,
  UserOutdatingData,
} from './user';
import {
  OutdatedHome,
  Partner,
  PartnerChangingData,
  PartnerDraft,
  PartnerOutdatingData,
} from './partner';

import type {
  Contact,
  Address,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  OptionalContacts,
  BaseOutdatedData,
} from '@shared/schemas/common.schema';

export type {
  Address,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  OptionalContacts,
  BaseOutdatedData,
};

export interface AdvancedModel extends BaseModel {
  address: Address;
  comment: string | null;
  orderedContacts: UserContacts | OptionalContacts;
  outdatedData: UserOutdatedData | PartnerOutdatedData;
}

/* export type RestoreTypeCommon = 'contacts' | 'addresses' | 'names';
export type RestoreTypeUser = RestoreTypeCommon | 'userNames';
export type RestoreTypePartner = RestoreTypeCommon | 'homes';
export type RestoreTypeOwner = RestoreTypeUser | RestoreTypePartner; */

export type Owner = User | Partner;
export type OwnerDraft = UserDraft | PartnerDraft;
export type OwnerContacts = UserContacts | OptionalContacts;
//export type OwnerRestoringData = UserRestoringData | PartnerRestoringData;
//export type OwnerDeletingData = UserDeletingData | PartnerDeletingData;
export type OwnerOutdatedData = UserOutdatedData | PartnerOutdatedData;
export type OwnerChangingData = UserChangingData | PartnerChangingData;
export type OwnerOutdatingData = UserOutdatingData | PartnerOutdatingData;

/* export type OwnerRestoringDataType =
  | PartnerRestoringDataType
  | UserRestoringDataType;
export type OwnerDeletingDataType =
  | PartnerDeletingDataType
  | UserDeletingDataType; */

type RestoreCommonKey = 'addresses' | 'names' | 'contacts';

export type BaseRestoringData = {
  addresses: number[] | null;
  names: number[] | null;
  contacts: Partial<
    Record<ContactType, Contact[]>
  > | null;
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

type ItemOf<T> = T extends (infer U)[] ? U : never;

// Для ключа K получить ТИП массива чисел из DD/RD

// ключи восстановления зависят от RD: если есть userNames — добавляем его
export type RestoreKeyFor<RD> =
  | RestoreCommonKey
  | (RD extends { userNames: number[] | null } ? 'userNames' : never)
  | (RD extends { homes: number[] | null } ? 'homes' : never);

export type DeleteKeyFor<DD> =
  | RestoreCommonKey
  | (DD extends { userNames: number[] | null } ? 'userNames' : never)
  | (DD extends { homes: number[] | null } ? 'homes' : never);
 export type DeleteKeyIn<DD> = Extract<DeleteKeyFor<DD>, keyof DD>;

export type OutdatedKeyFor<OD> =
  | RestoreCommonKey
  | (OD extends { userNames: OutdatedUserName[] } ? 'userNames' : never)
  | (OD extends { homes: OutdatedHome[] } ? 'homes' : never);

export  type OutdatedKeyIn<OD> = Extract<OutdatedKeyFor<OD>, keyof OD>;
export type OutdatedItemFor<OD, K extends keyof OD> = ItemOf<OD[K]>;

/* export type OutdatedDataCommon = {
  contacts: OutdatedContacts;
  addresses: OutdatedAddress[];
  names: OutdatedFullName[];
};

export type OutdatedDataUser = OutdatedDataCommon & {
  userNames: OutdatedUserName[];
};
 */
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

export function isContactType(value: string): value is ContactType {
  return value in contactTypeMap;
}
