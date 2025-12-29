import { FormControl, FormGroup } from '@angular/forms';
import { Address, AdvancedModel, OptionalContacts } from './advanced-model';
import type {
  //VolunteerDuplicates,
 // VolunteerDraft,
  VolunteerDraftContacts,
  VolunteerOutdatedData,
  VolunteerChangingData,
  VolunteerOutdatingData,
  OutdatedInstitute,
  Institute, Subscription, Cooperation
} from '@shared/schemas/volunteer.schema';

export type {
  //VolunteerDuplicates,
  //VolunteerDraft,
  VolunteerDraftContacts,
  VolunteerOutdatedData,
  VolunteerChangingData,
  VolunteerOutdatingData,
  OutdatedInstitute,
  Institute, Subscription, Cooperation
};

export interface Volunteer extends AdvancedModel {
  id: number;
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
  address: Address;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  orderedContacts: OptionalContacts;
  outdatedData: VolunteerOutdatedData;
  institutes: Institute[] | null;
  subscriptions: Subscription[] | null;
  cooperations: Cooperation[] | null;
}

export type InstituteFormGroup = FormGroup<{
  instituteName: FormControl<string | null>;
  category: FormControl<string | null>;
}>;


