import { BaseModel } from "./base-model";
import { AdvancedModel } from "./advanced-model";

export interface User extends AdvancedModel{
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
    district: { id: number; name: string } | null;
    locality: { id: number; name: string } | null;
    // isRestricted: boolean;
    id?: number;
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
    district: { id: number; name: string } | null;
    locality: { id: number; name: string } | null;
    id: number;
  }[];
  names: {
    firstName: string | null;
    patronymic: string | null;
    lastName: string | null;
    userName: string | null;
    id: number;
  }[];
}

export interface OutdatingData {
  address?: number;
  names?: {
    firstName: string;
    patronymic: string | null;
    lastName: string;
  };
  userName?: string;
  contacts?: number[];
}

export interface DeletingData {
  address?: number;
  contacts?: number[];
}

export interface ChangedData {
  firstName?: string;
  patronymic?: string | null;
  lastName?: string;
  userName?: string;
  addresses?: {
    countryId: number | null;
    regionId: number | null;
    districtId: number | null;
    localityId: number | null;
  };
  contacts?: Record<Exclude<ContactType, 'telegram'>, string[]>;
  roleId?: number;
  comment?: string | null;
  isRestricted?: boolean;
  causeOfRestriction?: string | null;
  dateOfRestriction?: Date | null;
}


