import { Volunteer, VolunteerContact } from '../../../models/index.js';

export async function createVolunteer(overrides = {}) {
  return Volunteer.create({
    firstName: 'Test',
    patronymic: null,
    lastName: 'Volunteer',
    comment: null,
    isRestricted: false,
    causeOfRestriction: null,
    dateOfRestriction: null,
    ...overrides,
  });
}

export async function createVolunteerContact(overrides = {}) {
  return VolunteerContact.create({ type: 'email', isRestricted: false, ...overrides });
}

export async function createVolunteerWithContact(overrides = {}, contactOverrides = {}) {
  const volunteer = await createVolunteer(overrides);
  const contact = await createVolunteerContact({ volunteerId: volunteer.id, ...contactOverrides });
  return { volunteer, contact };
}
