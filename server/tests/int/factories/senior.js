import { Senior } from '../../../models/index.js';

export async function createSenior(overrides = {}) {
  return Senior.create({
    firstName: 'Test Senior',
    gender: 'female',
    patronymic: overrides.patronymic ?? null,
    confirmedFirstName: false,
    confirmedPatronymic: false,
    confirmedLastName: false,
    confirmedBirthDate: false,
    infoNote: null,
    photoLink: null,
    dateOfConsent: null,
    kindergarten: null,
    teacher: null,
    veteran: null,
    childOfWar: null,
    profession: null,
    honoraryStatus: null,
    interests: null,
    orthodoxBeliever: null,
    comment: null,
    causeOfRestriction: null,
    dateOfRestriction: null,
    ...overrides,
  });
}
