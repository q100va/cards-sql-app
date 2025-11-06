import { BaseModel } from './base-model';
import type {
  Contacts,
  OutdatedData,
  Address,
} from '@shared/schemas/user.schema';

export interface AdvancedModel extends BaseModel {
  address: Address;
  comment: string | null;
  orderedContacts: Contacts;
  outdatedData: OutdatedData;
}
