import { partnerSchema } from '../../../shared/schemas/partner.schema';
import { PARTNER_AFFILIATION } from '../../../shared/constants/partners';

export function lifetimePartner(id = 10) {
  return partnerSchema.parse({
    id, firstName: 'Current', patronymic: 'Middle', lastName: 'Partner',
    affiliation: PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR, position: null,
    isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
    dateOfStart: '2026-01-15T00:00:00.000Z', comment: null,
    address: {
      id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
      district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
    },
    orderedContacts: { email: [{ id: 61, content: 'current@example.com' }] },
    outdatedData: { names: [], contacts: {}, addresses: [], coordinations: [] }, coordinations: [],
  });
}
