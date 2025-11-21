import { Address, AdvancedModel, OptionalContacts } from './advanced-model';

export interface Client extends AdvancedModel {
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
  //outdatedData: ClientOutdatedData;
}
