import { Address, AdvancedModel, OptionalContacts } from './advanced-model';
import type {
  PartnerDuplicates,
  PartnerDraft,
  PartnerDraftContacts,
  PartnerOutdatedData,
  PartnerChangingData,
  PartnerOutdatingData,
  OutdatedHome
} from '@shared/schemas/partner.schema';

export type {
  PartnerDuplicates,
  PartnerDraft,
  PartnerDraftContacts,
  PartnerOutdatedData,
  PartnerChangingData,
  PartnerOutdatingData,
  OutdatedHome
};

export interface Partner extends AdvancedModel {
  id: number;
  affiliation: string;
  position: string | null;
  firstName: string;
  patronymic: string | null;
  lastName: string | null;
  address: Address;
  comment: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  orderedContacts: OptionalContacts;
  outdatedData: PartnerOutdatedData;
  homes: OutdatedHome[] | null;
}


