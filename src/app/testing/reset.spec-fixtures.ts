import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { homeSchema } from '../../../shared/schemas/home.schema';
import { seniorSchema } from '../../../shared/schemas/senior.schema';
import { volunteerSchema } from '../../../shared/schemas/volunteer.schema';
import { AddressService } from '../services/address.service';
import { DiffConfirmService } from '../services/diff-confirm.service';
import { HomeService } from '../services/home.service';
import { MessageWrapperService } from '../services/message.service';
import { PartnerService } from '../services/partner.service';
import { RoleService } from '../services/role.service';
import { SeniorService } from '../services/senior.service';

export const resetActor = {
  id: 7, userName: 'editor', firstName: 'Test', lastName: 'Editor', roleId: 1, roleName: 'Editor',
};

const address = {
  id: 50, country: { id: 143, name: 'Country' }, region: { id: 20, shortName: 'Region' },
  district: { id: 30, shortName: 'District' }, locality: { id: 40, shortName: 'Locality' },
};

export function resetVolunteer() {
  return volunteerSchema.parse({
    id: 10, firstName: 'Current', patronymic: 'Middle', lastName: 'Volunteer',
    isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
    dateOfStart: '2026-01-15T00:00:00.000Z', dateOfLastOrder: null, comment: null, address,
    orderedContacts: { email: [{ id: 61, content: 'current@example.com' }] },
    institutes: [], subscriptions: [], cooperations: [],
    outdatedData: { names: [], addresses: [], contacts: {}, institutes: [], subscriptions: [], cooperations: [] },
  });
}

export function resetSenior() {
  return seniorSchema.parse({
    id: 10, firstName: 'Anna', patronymic: 'Middle', lastName: 'Senior', gender: 'female',
    birthDate: '1940-05-12T00:00:00.000Z', dateOfStart: '2026-01-15T00:00:00.000Z',
    confirmedFirstName: true, confirmedPatronymic: true, confirmedLastName: true, confirmedBirthDate: true,
    isRestricted: false, causeOfRestriction: null, dateOfRestriction: null, comment: null,
    infoNote: null, photoLink: null, dateOfConsent: null, personalNoAddr: false,
    kindergarten: null, teacher: null, veteran: null, childOfWar: null, profession: null,
    honoraryStatus: null, interests: null, orthodoxBeliever: null, dateOfExit: null,
    spouseId: null, spouseFullName: null, homeId: 20,
    address: {
      country: address.country, region: address.region, district: address.district, locality: address.locality,
      fullPostalAddress: 'Country, Region, District, Locality',
    },
    home: {
      homeName: 'Current Home', noAddress: false, specialHome: false, acceptableForSchool: true,
      isRestricted: false, dateOfRestriction: null, isClose: false, dateOfClose: null,
    },
    outdatedData: { names: [] },
  });
}

export function resetHome() {
  return homeSchema.parse({
    id: 10, homeName: 'Current Home', officialName: 'Current Official Home',
    noAddress: false, specialHome: false, acceptableForSchool: true,
    isRestricted: false, causeOfRestriction: null, dateOfRestriction: null,
    dateOfStart: '2026-01-15T00:00:00.000Z', dateOfLastUpdate: null,
    comment: null, infoNote: null, isClose: false, dateOfClose: null,
    address: {
      ...address, postalCode: '123456', postalName: 'Current Home', postalAddressPart: 'Building 1',
      fullPostalAddress: '123456 Country, Region, District, Locality, Building 1', isRecoverable: true,
    },
    orderedContacts: { email: [{ id: 61, content: 'current@example.com' }] },
    outdatedData: { addresses: [], officialNames: [], contacts: {}, coordinations: [] }, coordinations: [],
  });
}

export function provideResetLookups() {
  spyOn(TestBed.inject(RoleService), 'getRolesNamesList').and.returnValue(of({ data: [] }));
  spyOn(TestBed.inject(AddressService), 'getListOfToponyms').and.callFake((_ids, type) => of({
    data: [{ id: { countries: 143, regions: 20, districts: 30, localities: 40 }[type], name: type }],
  }));
  spyOn(TestBed.inject(HomeService), 'getPotentialHomesPickList').and.returnValue(of([]));
  spyOn(TestBed.inject(HomeService), 'getActiveHomesPickList').and.returnValue(of([]));
  spyOn(TestBed.inject(PartnerService), 'getActivePartnersPickList').and.returnValue(of([]));
  spyOn(TestBed.inject(SeniorService), 'getSeniorsPickList').and.returnValue(of([]));
  const confirmation = TestBed.inject(ConfirmationService);
  spyOn(confirmation, 'confirm').and.callFake(config => { config.accept?.(); return confirmation; });
  spyOn(TestBed.inject(DiffConfirmService), 'confirmOutdateOrDelete').and.resolveTo(true);
  spyOn(TestBed.inject(DiffConfirmService), 'confirmDataCorrectness').and.resolveTo(true);
  spyOn(TestBed.inject(MessageWrapperService), 'handle').and.stub();
}
