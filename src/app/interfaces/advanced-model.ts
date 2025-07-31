import { BaseModel } from './base-model';
import { Contacts, OutdatedData } from './user';

export interface AdvancedModel extends BaseModel {
  address: {
    country: { id: number; name: string } | null;
    region: { id: number; shortName: string } | null;
    district: { id: number; name: string } | null;
    locality: { id: number; name: string } | null;
    // isRestricted: boolean;
    id: number | null;
  };
  comment: string | null;
  orderedContacts: Contacts;
  outdatedData: OutdatedData;
}
