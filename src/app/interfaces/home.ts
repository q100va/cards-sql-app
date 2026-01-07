import { AdvancedModel } from './advanced-model';
import type {
  HomeDraftContacts,
  HomeOutdatedData,
  HomeChangingData,
  HomeOutdatingData,
  HomeCoordination,
  HomeAddress,
  PostalAddress,
  HomeContacts, OutdatedHomeAddress
  //OutdatedCoordination,
 // OutdatedOfficialName
} from '@shared/schemas/home.schema';

export type {
  HomeDraftContacts,
  HomeOutdatedData,
  HomeChangingData,
  HomeOutdatingData,
  HomeCoordination,
  HomeAddress,
  PostalAddress,
  HomeContacts, OutdatedHomeAddress
 // OutdatedCoordination,
  //OutdatedOfficialName
};

export interface Home extends AdvancedModel {
  id: number;
  homeName: string;
  officialName: string;
  postalName: string;
  noAddress: boolean;
  specialHome: boolean;
  acceptableForSchool: boolean;
  address: HomeAddress;
  postalAddress: PostalAddress;
  comment: string | null;
  infoNote: string | null;
  isRestricted: boolean;
  causeOfRestriction: string | null;
  dateOfRestriction: Date | null;
  orderedContacts: HomeContacts;
  outdatedData: HomeOutdatedData;
  coordinations: HomeCoordination[];
  dateOfLastUpdate: Date | null;
}
