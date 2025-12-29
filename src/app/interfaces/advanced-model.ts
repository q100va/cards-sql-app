import { BaseModel } from './base-model';
import { UserContacts, OutdatedUserName } from './user';
import { OutdatedHome } from './partner';
import {
  OutdatedInstitute,
  Institute,
  Subscription,
  Cooperation,
} from './volunteer';

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
import { Observable } from 'rxjs';

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
  outdatedData: UserOutdatedData | PartnerOutdatedData | VolunteerOutdatedData;
}

export type Kind = 'user' | 'partner' | 'volunteer';

export type OwnerDraft = UserDraft | PartnerDraft | VolunteerDraft;
export type OwnerContacts = UserContacts | OptionalContacts;

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
export type VolunteerRestoringData = BaseRestoringData & {
  institutes: number[] | null;
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

export type VolunteerDeletingData = BaseDeletingData & {
  institutes: number[] | null;
  subscriptions: number[] | null;
};

export type UserOutdatedData = BaseOutdatedData & {
  userNames: OutdatedUserName[];
};
export type PartnerOutdatedData = BaseOutdatedData & {
  homes: OutdatedHome[];
};
export type VolunteerOutdatedData = BaseOutdatedData & {
  institutes: OutdatedInstitute[];
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
export type PartnerChangingData = BaseChangingData<PartnerChangingMain> & {
  homes: number[] | null;
};
export type VolunteerChangingData = BaseChangingData<BaseChangingMain> & {
  institutes: {instituteName: string, category: string}[] | null;
  subscriptions: number[] | null;
  cooperations: number[] | null;
};

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
export type VolunteerOutdatingData = BaseOutdatingData & {
  institutes: number[] | null;
};

export type OwnerChangingData =
  | UserChangingData
  | PartnerChangingData
  | VolunteerChangingData;
export type OwnerOutdatingData =
  | UserOutdatingData
  | PartnerOutdatingData
  | VolunteerOutdatingData;
export type OwnerDeletingData =
  | UserDeletingData
  | PartnerDeletingData
  | VolunteerDeletingData;
export type OwnerRestoringData =
  | UserRestoringData
  | PartnerRestoringData
  | VolunteerRestoringData;

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
  draftHomes: number[];
};

export type VolunteerDraft = DraftCommon & {
  draftInstitutes: {instituteName: string, category: string}[];
  draftSubscriptions: number[];
  draftCooperations: number[];
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
  homes: OutdatedHome[];
};
export type Volunteer = Owner & {
  institutes: Institute[];
  subscriptions: Subscription[];
  cooperations: Cooperation[];
  outdatedData: VolunteerOutdatedData;
};

export type OwnerByKind<K extends Kind> =
  K extends 'user' ? User :
  K extends 'partner' ? Partner :
  K extends 'volunteer' ? Volunteer :
  never;

export type OwnerDraftByKind<K extends Kind> =
  K extends 'user' ? UserDraft :
  K extends 'partner' ? PartnerDraft :
  K extends 'volunteer' ? VolunteerDraft :
  never;

export type ChangingByKind<K extends Kind> =
  K extends 'user' ? UserChangingData :
  K extends 'partner' ? PartnerChangingData :
  K extends 'volunteer' ? VolunteerChangingData :
  never;

export type RestoringByKind<K extends Kind> =
  K extends 'user' ? UserRestoringData :
  K extends 'partner' ? PartnerRestoringData :
  K extends 'volunteer' ? VolunteerRestoringData :
  never;

export type OutdatingByKind<K extends Kind> =
  K extends 'user' ? UserOutdatingData :
  K extends 'partner' ? PartnerOutdatingData :
  K extends 'volunteer' ? VolunteerOutdatingData :
  never;

export type DeletingByKind<K extends Kind> =
  K extends 'user' ? UserDeletingData :
  K extends 'partner' ? PartnerDeletingData :
  K extends 'volunteer' ? VolunteerDeletingData :
  never;

export type OutdatedByKind<K extends Kind> =
  K extends 'user' ? UserOutdatedData :
  K extends 'partner' ? PartnerOutdatedData :
  K extends 'volunteer' ? VolunteerOutdatedData :
  never;

export type ListDto<K extends Kind> =
  K extends 'user' ? { list: User[]; length: number } :
  K extends 'partner' ? { list: Partner[]; length: number } :
  K extends 'volunteer' ? { list: Volunteer[]; length: number } :
  never;

export type UpdatedOwnerData<TChanging, TRestoring, TOutdating, TDeleting> = {
  changingData: TChanging;
  restoringData: TRestoring;
  outdatingData: TOutdating;
  deletingData: TDeleting;
};

type ApiResponse<T> = { data: T };

export interface OwnerMainService<
  TOwner,
  TOwnerDraft,
  TChanging,
  TRestoring,
  TOutdating,
  TDeleting,
  TListDto
> {
  checkOwnerData(ownerDraft: TOwnerDraft): Observable<ApiResponse<Duplicates>>;
  getById(id: number): Observable<ApiResponse<TOwner>>;
  saveOwner(ownerDraft: TOwnerDraft): Observable<ApiResponse<string>>;
  saveUpdatedOwner(
    id: number,
    updatedOwnerData: UpdatedOwnerData<
      TChanging,
      TRestoring,
      TOutdating,
      TDeleting
    >
  ): Observable<ApiResponse<TOwner>>;
  getList(
    filter: any,
    pageSize: number,
    page: number
  ): Observable<ApiResponse<TListDto>>;
  unblockOwner(id: number): Observable<ApiResponse<null>>;
  checkPossibilityToDeleteOwner(id: number): Observable<ApiResponse<number>>;
  deleteOwner(id: number): Observable<ApiResponse<null>>;
  getOwnerName(owner: TOwner): string;
}
