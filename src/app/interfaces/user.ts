import { BaseModel } from './base-model';
import { AdvancedModel } from './advanced-model';

export interface User extends AdvancedModel {
  id: number;
  userName: string;
  password: string;
  firstName: string;
  patronymic: string | null;
  lastName: string;
  roleId: number;
  roleName: string;
  address: {
    country: { id: number; name: string } | null;
    region: { id: number; shortName: string } | null;
    district: { id: number; shortName: string } | null;
    locality: { id: number; shortName: string } | null;
    // isRestricted: boolean;
    id: number;
  };
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  orderedContacts: Contacts;
  outdatedData: OutdatedData;
}

export interface Contact {
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
}

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

export interface OutdatedData {
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


export interface OutdatingData {
  address: number | null;
  names: {
    firstName: string;
    patronymic: string | null;
    lastName: string;
  } | null;
  userName: string | null;
  contacts: number[] | null;
}

/* export interface DeletingData {
  address: number | null;
  contacts: number[] | null;
} */

export interface DeletingData {
  userNames: number[] | null;
  names: number[] | null;
  addresses: number[] | null;
  contacts: number[] | null;
}


export interface ChangedData {
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
  }  | null;
}

export type CommonUserFields = keyof NonNullable<ChangedData['main']>;

export interface RestoringData {
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
}

export type RestoringDataType = keyof RestoringData;
export type DeletingOutdatedDataType = keyof DeletingData;
