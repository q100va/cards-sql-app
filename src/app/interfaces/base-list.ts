import { AddressFilter } from './toponym';
import { ContactType } from './user';

export interface GeneralFilter {
  roles?: { id: number; name: string }[];
  comment: string[];
  dateBeginningRange: Date[];
  dateRestrictionRange: Date[];
  contactTypes: { type: ContactType; label: string }[];
  affirmations?: string[];
}

export type FilterDraft = {
  viewOption: string;
  searchValue: string;
  includeOutdated: boolean;
  exactMatch: boolean;
  filter: GeneralFilter;
  addressFilter: AddressFilter;
  strongAddressFilter: boolean;
  strongContactFilter: boolean;
};

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
  addIcon: string;
}

export type FilterComponentSource =
  | 'toponymCard'
  | 'toponymList'
  | 'userCard'
  | 'userList'
  | 'partnerList';

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
  | 'vKontakte'
  | 'instagram'
  | 'facebook'
  | 'otherContact';
