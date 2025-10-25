import { ContactType } from './user';

export interface GeneralFilter {
  roles: { id: number; name: string }[];
  comment: string[];
  dateBeginningRange: Date[];
  dateRestrictionRange: Date[];
  contactTypes: { type: ContactType; label: string }[];
}

export interface ColumnDefinition {
  id: number;
  columnName: string;
  columnFullName: string;
  isUnchangeable: boolean;
}

export interface ViewOption {
  id: 'all' | 'only-active' | 'only-blocked';
  name: string;
  initiallySelected: boolean;
}

export interface TableParams {
  title: string;
  addTitle: string;
  searchPlaceholder: string;
}

export type ListComponentType =
  | 'user'
  | 'partner'
  | 'volunteer'
  | 'home'
  | 'senior';

 export interface ContactParamsForList {
  type: string;
  label: string;
  svg: string;
}

export type ContactTypeForList =
  | 'email'
  | 'phoneNumber'
  | 'whatsApp'
  | 'telegram'
  | 'telegramPhoneNumber'
  | 'vKontakte'
  | 'instagram'
  | 'facebook'
  | 'otherContact';
