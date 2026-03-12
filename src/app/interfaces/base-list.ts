import { AddressFilter } from './toponym';
import { ContactType, RelationPick } from './advanced-model';

export interface GeneralFilter {
  roles: { id: number; name: string }[];
  dateBeginningRange: Date[];
  dateRestrictionRange: Date[];
  dateExitRange: Date[];
  dateUpdateRange: Date[];
  dateLastOrderRange: Date[];
  contactTypes: { type: ContactType; label: string }[];
  affiliations: string[];
  categories: string[];
  homes: RelationPick[];
  homeRegions: { id: number; name: string }[];
  partners: RelationPick[];
  subscriptions: RelationPick[];
  cooperations: RelationPick[];
  gender: string | null;
  details: { value: string; label: string }[];
  noAddress: boolean | null;
  specialHome: boolean | null;
  acceptableForSchool: boolean | null;
  hasCoordination: boolean | null;
  hasInstitute: boolean | null;
  hasSubscription: boolean | null;
  hasCooperation: boolean | null;
  birthDate: { dayRange: number[]; monthRange: number[]; yearRange: number[] };
  hideWithoutYear: boolean;
  hideWithoutBirthday: boolean;
}

export interface AllFilterParameters {
  viewOption: string;
  viewHomeOption: string;
  includeOutdated: boolean;
  searchValue: string;
  exactMatch: boolean;
  sortParameters: {
    active: string;
    direction: 'asc' | 'desc' | '';
  };
  filter: GeneralFilter;
  addressFilter: AddressFilter;
  strongAddressFilter: boolean;
  strongContactFilter: boolean;
  strongDetailFilter: boolean;
}

export const createEmptyGeneralFilter = () => ({
  roles: [],
  contactTypes: [],
  dateBeginningRange: [],
  dateRestrictionRange: [],
  dateExitRange: [],
  dateUpdateRange: [],
  dateLastOrderRange: [],
  affiliations: [],
  categories: [],
  homes: [],
  homeRegions: [],
  partners: [],
  subscriptions: [],
  cooperations: [],
  gender: null,
  details: [],
  noAddress: null,
  specialHome: null,
  acceptableForSchool: null,
  hasCoordination: null,
  hasInstitute: null,
  hasSubscription: null,
  hasCooperation: null,
  birthDate: { dayRange: [], monthRange: [], yearRange: [] },
  hideWithoutYear: false,
  hideWithoutBirthday: false,
});
/*
export const fullDetailsOptions = [
  { value: 'comment', label: 'NAV.FILTER.COMMENT_OPT' },
  { value: 'photoLink', label: 'NAV.FILTER.PHOTO_LINK_OPT' },
  { value: 'dateOfConsent', label: 'NAV.FILTER.CONSENT_OPT' },
  {
    value: 'kindergarten',
    label: 'NAV.FILTER.KINDERGARTEN_OPT',
  },
  { value: 'teacher', label: 'NAV.FILTER.TEACHER_OPT' },
  { value: 'honoraryStatus', label: 'NAV.FILTER.HONORARY_OPT' },
  { value: 'veteran', label: 'NAV.FILTER.VETERAN_OPT' },
  { value: 'childOfWar', label: 'NAV.FILTER.CHILD_OF_WAR_OPT' },
  {
    value: 'orthodoxBeliever',
    label: 'NAV.FILTER.BELIEVER_OPT',
  },
  { value: 'profession', label: 'NAV.FILTER.PROFESSION_OPT' },
  { value: 'interests', label: 'NAV.FILTER.INTERESTS_OPT' },
  { value: 'spouseId', label: 'NAV.FILTER.SPOUSE_OPT' },
];
 */
export type FilterDraft = {
  viewOption: string;
  searchValue: string;
  includeOutdated: boolean;
  exactMatch: boolean;
  filter: GeneralFilter;
  addressFilter: AddressFilter;
  strongAddressFilter: boolean;
  strongContactFilter: boolean;
  strongDetailFilter: boolean;
};

export interface ColumnDefinition {
  id: number;
  columnName: string;
  columnFullName: string;
  isUnchangeable: boolean;
}

export interface ViewOption {
  id:
    | 'all'
    | 'only-active'
    | 'only-blocked'
    | 'only-closed'
    | 'exclude-closed'
    | 'exclude-discharged'
    | 'only-discharged'
    | 'exclude-blocked-quitted';
  name: string;
  initiallySelected: boolean;
}

export interface TableParams {
  title: string;
  addTitle: string;
  searchPlaceholder: string;
  addIcon: string;
  labels: {
    blockLabel: string;
    closeLabel: string;
    notActiveLabel: string;
  };
}

export type FilterComponentSource =
  | 'toponymCard'
  | 'toponymList'
  | 'userCard'
  | 'userList'
  | 'partnerList'
  | 'partnerCard'
  | 'volunteerList'
  | 'volunteerCard'
  | 'homeList'
  | 'homeCard'
  | 'seniorList'
  | 'seniorCard';

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
  | 'website'
  | 'otherContact';
