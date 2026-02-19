//import { BaseModel } from './base-model';
import {
  UserContacts,
  OutdatedUserName,
  ChangePassword,
} from '../../../shared/schemas/user.schema';
import { OutdatedHome } from '../../../shared/schemas/partner.schema';
import {
  OutdatedInstitute,
  Institute,
  Subscription,
  Cooperation,
} from '../../../shared/schemas/volunteer.schema';

import type {
  HomeAddress,
  HomeCoordination,
  HomeAddressDraft,
  OutdatedCoordination,
  OutdatedOfficialName,
  OutdatedHomeAddress,
} from '../../../shared/schemas/home.schema';

import type { SeniorAddress } from '../../../shared/schemas/senior.schema';

import type {
  Contact,
  Address,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  OptionalContacts,
  DraftAddress,
  Duplicates,
} from '../../../shared/schemas/common.schema';

import { Observable } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';

export type {
  Address,
  OutdatedContacts,
  OutdatedAddress,
  OutdatedFullName,
  Contact,
  OptionalContacts,
  Duplicates,
  OutdatedCoordination,
  OutdatedOfficialName,
  HomeCoordination,
  OutdatedHomeAddress,
  UserContacts,
  OutdatedUserName,
  OutdatedInstitute,
  Subscription,
  Cooperation,
  ChangePassword,
  Institute,
  DraftAddress,
};

/* export interface AdvancedModel extends BaseModel {
  address: Address | HomeAddress | SeniorAddress;
  comment: string | null;
  orderedContacts: UserContacts | OptionalContacts;
  outdatedData:
    | UserOutdatedData
    | PartnerOutdatedData
    | VolunteerOutdatedData
    | HomeOutdatedData
    | SeniorOutdatedData;
} */

export type InstituteFormGroup = FormGroup<{
  instituteName: FormControl<string | null>;
  category: FormControl<string | null>;
}>;

export type Kind = 'user' | 'partner' | 'volunteer' | 'home' | 'senior';

export type OwnerDraft =
  | UserDraft
  | PartnerDraft
  | VolunteerDraft
  | HomeDraft
  | SeniorDraft;
export type OwnerContacts = UserContacts | OptionalContacts;

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
  coordinations: number[] | null;
};
export type VolunteerRestoringData = PersonRestoringData & {
  institutes: number[] | null;
};
export type SeniorRestoringData = {
  names: number[] | null;
};

export type HomeRestoringData = BaseRestoringData & {
  officialNames: number[] | null;
  coordinations: number[] | null;
};

type BaseDeletingData = {};
type PersonDeletingData = BaseDeletingData & {
  names: number[] | null;
};
export type UserDeletingData = PersonDeletingData & {
  addresses: number[] | null;
  userNames: number[] | null;
  contacts: number[] | null;
};
export type PartnerDeletingData = PersonDeletingData & {
  addresses: number[] | null;
  coordinations: number[] | null;
  contacts: number[] | null;
};
export type VolunteerDeletingData = PersonDeletingData & {
  addresses: number[] | null;
  institutes: number[] | null;
  subscriptions: number[] | null;
  contacts: number[] | null;
};
export type SeniorDeletingData = PersonDeletingData;
export type HomeDeletingData = BaseDeletingData & {
  addresses: number[] | null;
  officialNames: number[] | null;
  coordinations: number[] | null;
  contacts: number[] | null;
};

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
};
type AdvancedChangingData<M extends BaseChangingMain = BaseChangingMain> = {
  main: M | null;
  address: DraftAddress | null;
  contacts: Partial<Record<ContactType, string[]>> | null;
};

export type UserChangingMain = PersonChangingMain & {
  userName?: string;
  roleId?: number;
};
export type UserChangingData = AdvancedChangingData<UserChangingMain>;

export type PartnerChangingMain = PersonChangingMain & {
  affiliation?: string; // enum ?
  position?: string | null;
};
export type PartnerChangingData = AdvancedChangingData<PartnerChangingMain> & {
  coordinations: number[] | null;
};

export type VolunteerChangingData = AdvancedChangingData<PersonChangingMain> & {
  institutes: { instituteName: string; category: string }[] | null;
  subscriptions: number[] | null;
  cooperations: number[] | null;
};

export type HomeChangingMain = BaseChangingMain & {
  homeName?: string;
  officialName?: string;
  noAddress?: boolean;
  specialHome?: boolean;
  acceptableForSchool?: boolean;
  isClose?: boolean;
  dateOfClose?: Date | null;
  infoNote?: string | null;
};
export type HomeChangingData = AdvancedChangingData<HomeChangingMain> & {
  coordinations: number[] | null;
};
export type SeniorChangingMain = PersonChangingMain & {
  birthDate?: Date | null;
  confirmedFirstName?: boolean;
  confirmedPatronymic?: boolean;
  confirmedLastName?: boolean;
  confirmedBirthDate?: boolean;
  gender?: 'male' | 'female';
  infoNote?: string | null;
  photoLink?: string | null;
  dateOfConsent?: Date | null;
  personalNoAddr?: boolean;
  kindergarten?: string | null;
  teacher?: string | null;
  veteran?: string | null;
  childOfWar?: string | null;
  profession?: string | null;
  honoraryStatus?: string | null;
  interests?: string | null;
  orthodoxBeliever?: string | null;
  dateOfExit?: Date | null;
  homeId?: number;
  spouseId?: number | null;
};
export type SeniorChangingData = BaseChangingData<SeniorChangingMain>;

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
  coordinations: number[] | null;
};
export type VolunteerOutdatingData = PersonOutdatingData & {
  institutes: number[] | null;
};
export type HomeOutdatingData = BaseOutdatingData & {
  officialName: string | null;
  coordinations: number[] | null;
};
export type SeniorOutdatingData = {
  names: BaseOutdatingNames | null;
};

export type OwnerChangingData =
  | UserChangingData
  | PartnerChangingData
  | VolunteerChangingData
  | HomeChangingData
  | SeniorChangingData;
export type OwnerOutdatingData =
  | UserOutdatingData
  | PartnerOutdatingData
  | VolunteerOutdatingData
  | HomeOutdatingData
  | SeniorOutdatingData;
export type OwnerDeletingData =
  | UserDeletingData
  | PartnerDeletingData
  | VolunteerDeletingData
  | HomeDeletingData
  | SeniorDeletingData;

export type OwnerRestoringData =
  | UserRestoringData
  | PartnerRestoringData
  | VolunteerRestoringData
  | HomeRestoringData
  | SeniorRestoringData;

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
};

export type PersonDraft = DraftCommon & {
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
};

export type UserDraft = PersonDraft & {
  draftAddress: DraftAddress;
  draftContacts: Record<NonTelegram, string[]>;
  userName: string;
  password: string;
  roleId: number;
};

export type PartnerDraft = PersonDraft & {
  draftAddress: DraftAddress;
  draftContacts: Record<NonTelegram, string[]>;
  affiliation: string;
  position: string | null;
  draftCoordinations: number[];
};

export type VolunteerDraft = PersonDraft & {
  draftAddress: DraftAddress;
  draftContacts: Record<NonTelegram, string[]>;
  draftInstitutes: { instituteName: string; category: string }[];
  draftSubscriptions: number[];
  draftCooperations: number[];
};

export type HomeDraft = DraftCommon & {
  draftContacts: Record<NonTelegram, string[]>;
  homeName: string;
  officialName: string;
  postalName: string;
  noAddress: boolean;
  specialHome: boolean;
  acceptableForSchool: boolean;
  draftAddress: HomeAddressDraft;
  postalCode: string;
  postalAddressPart: string | null;
  infoNote: string | null;
  draftCoordinations: number[];
  isClose: boolean;
  dateOfClose: Date | null;
};
export type SeniorDraft = PersonDraft & {
  birthDate: Date | null;
  gender: 'male' | 'female';
  infoNote: string | null;
  photoLink: string | null;
  dateOfConsent: Date | null;
  personalNoAddr: boolean;
  kindergarten: string | null;
  teacher: string | null;
  veteran: string | null;
  childOfWar: string | null;
  profession: string | null;
  honoraryStatus: string | null;
  interests: string | null;
  orthodoxBeliever: string | null;
  dateOfExit: Date | null;
  confirmedFirstName: boolean;
  confirmedPatronymic: boolean;
  confirmedLastName: boolean;
  confirmedBirthDate: boolean;
  spouseId: number | null;
  homeId: number;
};

type BaseOutdatedData = {};
type PersonOutdatedData = BaseOutdatedData & {
  names: OutdatedFullName[];
};
export type UserOutdatedData = PersonOutdatedData & {
  addresses: OutdatedAddress[];
  contacts: OutdatedContacts;
  userNames: OutdatedUserName[];
};
export type PartnerOutdatedData = PersonOutdatedData & {
  addresses: OutdatedAddress[];
  contacts: OutdatedContacts;
  coordinations: OutdatedHome[];
};
export type VolunteerOutdatedData = PersonOutdatedData & {
  addresses: OutdatedAddress[];
  contacts: OutdatedContacts;
  institutes: OutdatedInstitute[];
};
export type HomeOutdatedData = BaseOutdatedData & {
  contacts: OutdatedContacts;
  addresses: OutdatedHomeAddress[];
  coordinations: OutdatedCoordination[];
  officialNames: OutdatedOfficialName[];
};
export type SeniorOutdatedData = PersonOutdatedData;

export type Owner = {
  id: number;
  comment: string | null;
  dateOfStart: Date;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  address: Address;
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
  coordinations: HomeCoordination[];
  orderedContacts: OptionalContacts;
};
export type Volunteer = Person & {
  institutes: Institute[];
  subscriptions: Subscription[];
  cooperations: Cooperation[];
  outdatedData: VolunteerOutdatedData;
  orderedContacts: OptionalContacts;
};
export type Home = Owner & {
  homeName: string;
  officialName: string;
  noAddress: boolean;
  specialHome: boolean;
  acceptableForSchool: boolean;
  address: HomeAddress;
  infoNote: string | null;
  orderedContacts: OptionalContacts;
  outdatedData: HomeOutdatedData;
  coordinations: HomeCoordination[];
  dateOfLastUpdate: Date | null;
  isClose: boolean;
  dateOfClose: Date | null;
};
export type Senior = Person & {
  address: SeniorAddress;
  outdatedData: SeniorOutdatedData;
  birthDate: Date | null;
  gender: 'male' | 'female';
  infoNote: string | null;
  photoLink: string | null;
  dateOfConsent: Date | null;
  personalNoAddr: boolean;
  kindergarten: string | null;
  teacher: string | null;
  veteran: string | null;
  childOfWar: string | null;
  profession: string | null;
  honoraryStatus: string | null;
  interests: string | null;
  orthodoxBeliever: string | null;
  dateOfExit: Date | null;
  confirmedFirstName?: boolean;
  confirmedPatronymic?: boolean;
  confirmedLastName?: boolean;
  confirmedBirthDate?: boolean;
  spouseId: number | null;
  spouseFullName: string | null;
  homeId: number;
  //homeName: string;
  home: {
    homeName: string;
    noAddress: boolean;
    specialHome: boolean;
    acceptableForSchool: boolean;
    isRestricted: boolean;
    dateOfRestriction: Date | null;
    isClose: boolean;
    dateOfClose: Date | null;
  };
};

export type ConfOwnerByKind = {
  user: User;
  partner: Partner;
  volunteer: Volunteer;
  home: Home;
  senior: Senior;
};

export type OwnerByKind<K extends Kind> =
  ConfOwnerByKind[K]; /* K extends 'user'
  ? User
  : K extends 'partner'
    ? Partner
    : K extends 'volunteer'
      ? Volunteer
      : K extends 'home'
        ? Home
        : K extends 'senior'
          ? Senior
          : never; */

export type ConfOwnerDraftByKind = {
  user: UserDraft;
  partner: PartnerDraft;
  volunteer: VolunteerDraft;
  home: HomeDraft;
  senior: SeniorDraft;
};
export type OwnerDraftByKind<K extends Kind> = ConfOwnerDraftByKind[K];

/* export type OwnerDraftByKind<K extends Kind> = K extends 'user'
  ? UserDraft
  : K extends 'partner'
    ? PartnerDraft
    : K extends 'volunteer'
      ? VolunteerDraft
      : K extends 'home'
        ? HomeDraft
        : K extends 'senior'
          ? SeniorDraft
          : never; */

export type ConfChangingByKind = {
  user: UserChangingData;
  partner: PartnerChangingData;
  volunteer: VolunteerChangingData;
  home: HomeChangingData;
  senior: SeniorChangingData;
};

export type ChangingByKind<K extends Kind> = ConfChangingByKind[K];
/* K extends 'user'
  ? UserChangingData
  : K extends 'partner'
    ? PartnerChangingData
    : K extends 'volunteer'
      ? VolunteerChangingData
      : K extends 'home'
        ? HomeChangingData
        : K extends 'senior'
          ? SeniorChangingData
          : never;
 */
export type RestoringByKind<K extends Kind> = K extends 'user'
  ? UserRestoringData
  : K extends 'partner'
    ? PartnerRestoringData
    : K extends 'volunteer'
      ? VolunteerRestoringData
      : K extends 'home'
        ? HomeRestoringData
        : K extends 'senior'
          ? SeniorRestoringData
          : never;

export type OutdatingByKind<K extends Kind> = K extends 'user'
  ? UserOutdatingData
  : K extends 'partner'
    ? PartnerOutdatingData
    : K extends 'volunteer'
      ? VolunteerOutdatingData
      : K extends 'home'
        ? HomeOutdatingData
        : K extends 'senior'
          ? SeniorOutdatingData
          : never;

export type DeletingByKind<K extends Kind> = K extends 'user'
  ? UserDeletingData
  : K extends 'partner'
    ? PartnerDeletingData
    : K extends 'volunteer'
      ? VolunteerDeletingData
      : K extends 'home'
        ? HomeDeletingData
        : K extends 'senior'
          ? SeniorDeletingData
          : never;

export type OutdatedByKind<K extends Kind> = K extends 'user'
  ? UserOutdatedData
  : K extends 'partner'
    ? PartnerOutdatedData
    : K extends 'volunteer'
      ? VolunteerOutdatedData
      : K extends 'home'
        ? HomeOutdatedData
        : K extends 'senior'
          ? SeniorOutdatedData
          : never;

export type ConfListDto = {
  user: { list: User[]; length: number };
  partner: { list: Partner[]; length: number };
  volunteer: { list: Volunteer[]; length: number };
  home: { list: Home[]; length: number };
  senior: { list: Senior[]; length: number };
};

export type ListDto<K extends Kind> = ConfListDto[K];

/* K extends 'user'
  ? { list: User[]; length: number }
  : K extends 'partner'
    ? { list: Partner[]; length: number }
    : K extends 'volunteer'
      ? { list: Volunteer[]; length: number }
      : K extends 'home'
        ? { list: Home[]; length: number }
        : K extends 'senior'
          ? { list: Senior[]; length: number }
          : never; */

export type RelationPick = {
  id: number;
  name: string;
  fullPostalAddress?: string;
  countryId?: number;
  regionId?: number;
  districtId?: number;
  localityId?: number;
};

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
  TListDto,
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
    >,
  ): Observable<ApiResponse<TOwner>>;
  getList(
    filter: any,
    pageSize: number,
    page: number,
  ): Observable<ApiResponse<TListDto>>;
  unblockOwner(id: number): Observable<ApiResponse<null>>;
  checkPossibilityToDeleteOwner(id: number): Observable<ApiResponse<number>>;
  deleteOwner(id: number): Observable<ApiResponse<null>>;
  getOwnerName(owner: TOwner): string;
}
