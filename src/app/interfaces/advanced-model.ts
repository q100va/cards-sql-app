import { BaseModel } from './base-model';
import { UserContacts, OutdatedUserName, UserOutdatedData } from './user';
import { OutdatedHome, PartnerOutdatedData } from './partner';
import {
  OutdatedInstitute,
  Institute,
  Subscription,
  Cooperation,
  VolunteerOutdatedData,
} from './volunteer';
import {
  HomeAddress,
  HomeContacts,
  HomeCoordination,
  HomeOutdatedData,
  PostalAddress,
} from './home';

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
  //BaseOutdatedData,
  Duplicates,
};

export interface AdvancedModel extends BaseModel {
  address: Address | HomeAddress;
  comment: string | null;
  orderedContacts: UserContacts | OptionalContacts | HomeContacts;
  outdatedData:
    | UserOutdatedData
    | PartnerOutdatedData
    | VolunteerOutdatedData
    | HomeOutdatedData;
}

export type Kind = 'user' | 'partner' | 'volunteer' | 'home';

export type OwnerDraft = UserDraft | PartnerDraft | VolunteerDraft | HomeDraft;
export type OwnerContacts = UserContacts | OptionalContacts | HomeContacts;

type BaseRestoringData = {
  addresses: number[] | null;
  contacts: Partial<Record<ContactType, Contact[]>> | null;
};

type PersonRestoringData = BaseRestoringData & {
  names: number[] | null;
};

export type UserRestoringData = PersonRestoringData & {
  userNames: number[] | null;
};
export type PartnerRestoringData = PersonRestoringData & {
  homes: number[] | null;
};
export type VolunteerRestoringData = PersonRestoringData & {
  institutes: number[] | null;
};
export type HomeRestoringData = BaseRestoringData & {
  officialNames: number[] | null;
  partners: number[] | null;
};

type BaseDeletingData = {
  addresses: number[] | null;
  contacts: number[] | null;
};
type PersonDeletingData = BaseDeletingData & {
  names: number[] | null;
};
export type UserDeletingData = PersonDeletingData & {
  userNames: number[] | null;
};
export type PartnerDeletingData = PersonDeletingData & {
  homes: number[] | null;
};
export type VolunteerDeletingData = PersonDeletingData & {
  institutes: number[] | null;
  subscriptions: number[] | null;
};
export type HomeDeletingData = BaseDeletingData & {
  officialNames: number[] | null;
  partners: number[] | null;
};

/* type BaseOutdatedData = {
  addresses: number[] | null;
  contacts: number[] | null;
};
type PersonOutdatedData = BaseDeletingData & {
  names: number[] | null;
};
export type UserOutdatedData = PersonOutdatedData & {
  userNames: OutdatedUserName[];
};
export type PartnerOutdatedData = PersonOutdatedData & {
  homes: OutdatedHome[];
};
export type VolunteerOutdatedData = PersonOutdatedData & {
  institutes: OutdatedInstitute[];
};
export type HomeOutdatedData = BaseOutdatedData & {
  partners: OutdatedCoordination[];
  officialNames: OutdatedOfficialName[];
}; */

type BaseChangingMain = {
  comment?: string | null;
  isRestricted?: boolean;
  causeOfRestriction?: string | null;
  dateOfRestriction?: Date | null;
};
type PersonChangingMain = BaseChangingMain & {
  firstName?: string;
  patronymic?: string | null;
  lastName?: string | null;
};
type BaseChangingData<M extends BaseChangingMain = BaseChangingMain> = {
  main: M | null;
  address: DraftAddress | null;
  contacts: Partial<Record<ContactType, string[]>> | null;
};

export type UserChangingMain = PersonChangingMain & {
  userName?: string;
  roleId?: number;
};
export type UserChangingData = BaseChangingData<UserChangingMain>;

export type PartnerChangingMain = PersonChangingMain & {
  affiliation?: string; // можешь заменить на union из трёх ключей enum’а
  position?: string | null;
};
export type PartnerChangingData = BaseChangingData<PartnerChangingMain> & {
  homes: number[] | null;
};

export type VolunteerChangingData = BaseChangingData<PersonChangingMain> & {
  institutes: { instituteName: string; category: string }[] | null;
  subscriptions: number[] | null;
  cooperations: number[] | null;
};

export type HomeChangingMain = BaseChangingMain & {
  affiliation?: string;
  position?: string | null;
};
export type HomeChangingData = BaseChangingData<HomeChangingMain> & {
  partners: number[] | null;
};

type BaseOutdatingNames = {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};
type BaseOutdatingData = {
  address: number | null;
  contacts: number[] | null;
};
type PersonOutdatingData = BaseOutdatingData & {
  names: BaseOutdatingNames | null;
};

export type UserOutdatingData = PersonOutdatingData & {
  userName: string | null;
};
export type PartnerOutdatingData = PersonOutdatingData & {
  homes: number[] | null;
};
export type VolunteerOutdatingData = PersonOutdatingData & {
  institutes: number[] | null;
};
export type HomeOutdatingData = BaseOutdatingData & {
  officialNames: number[] | null;
  partners: number[] | null;
};

export type OwnerChangingData =
  | UserChangingData
  | PartnerChangingData
  | VolunteerChangingData
  | HomeChangingData;
export type OwnerOutdatingData =
  | UserOutdatingData
  | PartnerOutdatingData
  | VolunteerOutdatingData
  | HomeOutdatingData;
export type OwnerDeletingData =
  | UserDeletingData
  | PartnerDeletingData
  | VolunteerDeletingData
  | HomeDeletingData;

export type OwnerRestoringData =
  | UserRestoringData
  | PartnerRestoringData
  | VolunteerRestoringData
  | HomeRestoringData;

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
  website: true,
  otherContact: true,
} as const;
export type ContactType = keyof typeof contactTypeMap;
export type NonTelegram = Exclude<ContactType, 'telegram'>;
export function isContactType(value: string): value is ContactType {
  return value in contactTypeMap;
}

export type DraftCommon = {
  id: number | null;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  draftAddress: DraftAddress;
  draftContacts: Record<NonTelegram, string[]>;
};

export type PersonDraft = DraftCommon & {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};

export type UserDraft = PersonDraft & {
  userName: string;
  password: string;
  roleId: number;
};

export type PartnerDraft = PersonDraft & {
  affiliation: string;
  position: string | null;
  draftHomes: number[];
};

export type VolunteerDraft = PersonDraft & {
  draftInstitutes: { instituteName: string; category: string }[];
  draftSubscriptions: number[];
  draftCooperations: number[];
};

export type HomeDraft = DraftCommon & {
  homeName: string;
  officialName: string;
  postalName: string;
  noAddress: boolean;
  specialHome: boolean;
  acceptableForSchool: boolean;
  draftAddress: Exclude<HomeAddress, 'id'>;
  postalCode: string;
  postalAddressPart: string | null;
  infoNote: string | null;
  draftCoordinations: number[];
};

export type Owner = {
  id: number;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  address: Address;
  orderedContacts: OptionalContacts;
  outdatedData: BaseOutdatedData;
};

export type Person = Owner & {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};

export type User = Person & {
  userName: string;
  lastName: string;
  roleId: number;
  roleName: string;
  orderedContacts: UserContacts;
  outdatedData: UserOutdatedData;
};
export type Partner = Person & {
  affiliation: string;
  position: string | null;
  outdatedData: PartnerOutdatedData;
  homes: OutdatedHome[];
};
export type Volunteer = Person & {
  institutes: Institute[];
  subscriptions: Subscription[];
  cooperations: Cooperation[];
  outdatedData: VolunteerOutdatedData;
};
export type Home = Owner & {
  homeName: string;
  officialName: string;
  postalName: string;
  noAddress: boolean;
  specialHome: boolean;
  acceptableForSchool: boolean;
  address: HomeAddress;
  postalAddress: PostalAddress;
  infoNote: string | null;
  orderedContacts: HomeContacts;
  outdatedData: HomeOutdatedData;
  partners: HomeCoordination[];
  dateOfLastUpdate: Date | null;
};

export type OwnerByKind<K extends Kind> = K extends 'user'
  ? User
  : K extends 'partner'
  ? Partner
  : K extends 'volunteer'
  ? Volunteer
  : K extends 'home'
  ? Home
  : never;

export type OwnerDraftByKind<K extends Kind> = K extends 'user'
  ? UserDraft
  : K extends 'partner'
  ? PartnerDraft
  : K extends 'volunteer'
  ? VolunteerDraft
  : K extends 'home'
  ? HomeDraft
  : never;

export type ChangingByKind<K extends Kind> = K extends 'user'
  ? UserChangingData
  : K extends 'partner'
  ? PartnerChangingData
  : K extends 'volunteer'
  ? VolunteerChangingData
  : K extends 'home'
  ? HomeChangingData
  : never;

export type RestoringByKind<K extends Kind> = K extends 'user'
  ? UserRestoringData
  : K extends 'partner'
  ? PartnerRestoringData
  : K extends 'volunteer'
  ? VolunteerRestoringData
  : K extends 'home'
  ? HomeRestoringData
  : never;

export type OutdatingByKind<K extends Kind> = K extends 'user'
  ? UserOutdatingData
  : K extends 'partner'
  ? PartnerOutdatingData
  : K extends 'volunteer'
  ? VolunteerOutdatingData
  : K extends 'home'
  ? HomeOutdatingData
  : never;

export type DeletingByKind<K extends Kind> = K extends 'user'
  ? UserDeletingData
  : K extends 'partner'
  ? PartnerDeletingData
  : K extends 'volunteer'
  ? VolunteerDeletingData
  : K extends 'home'
  ? HomeDeletingData
  : never;

export type OutdatedByKind<K extends Kind> = K extends 'user'
  ? UserOutdatedData
  : K extends 'partner'
  ? PartnerOutdatedData
  : K extends 'volunteer'
  ? VolunteerOutdatedData
  : K extends 'home'
  ? HomeOutdatedData
  : never;

export type ListDto<K extends Kind> = K extends 'user'
  ? { list: User[]; length: number }
  : K extends 'partner'
  ? { list: Partner[]; length: number }
  : K extends 'volunteer'
  ? { list: Volunteer[]; length: number }
  : K extends 'home'
  ? { list: Home[]; length: number }
  : never;

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
