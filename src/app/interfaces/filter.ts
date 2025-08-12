export interface GeneralFilter {
  roles: string[];
  comment: string[];
  dateBeginningRange: Date[];
  dateRestrictionRange: Date[];
  contactTypes: {type: string, label: string}[];
}
