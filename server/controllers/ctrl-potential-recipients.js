import { Op } from 'sequelize';
import CustomError from "../shared/customError.js";
import { Senior, Recipient } from "../models/index.js";
import { OCCASION_TYPE } from '../../shared/dist/constants/occasions.js';
import { getByBirthMonth } from './ctrl-common-helpers.js';

async function getExistingIds(occasionId, homeId) {
  const recipients = await Recipient.findAll({
    where: {
      occasionId,
      homeIdSnapshot: homeId,
    },
    attributes: ['seniorId'],
  });

  return recipients.map((recipient) => recipient.seniorId);
}

function buildFullData(senior) {
  const [year, month, day] = s.birthDate.split('-').map(Number);
  const firstName = senior.firstName ?? '';
  const patronymic = senior.patronymic ?? '';
  const lastName = senior.lastName ?? '';
  const birthDate = senior.birthDate ?
    [
      year > 1800 ? year : '?',
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
    ].join('-')
    : '';

  return [
    firstName,
    patronymic,
    lastName,
    birthDate,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function getBirthdayPotentialRecipients(
  occasion,
  homeId,
) {
  const existingIds = await getExistingIds(
    occasion.id,
    homeId,
  );

  const conditions = [
    getByBirthMonth(occasion.month),
    { dateOfExit: null },
    { isRestricted: false },
    { homeId },
  ];

  if (existingIds.length) {
    conditions.push({
      id: {
        [Op.notIn]: existingIds,
      },
    });
  }

  const seniors = await Senior.findAll({
    where: {
      [Op.and]: conditions,
    },
    attributes: [
      'id',
      'lastName',
      'firstName',
      'patronymic',
      'birthDate',
    ],
  });

  return seniors.map((senior) => ({
    id: senior.id,
    fullData: buildFullData(senior),
  }));
}

// TODO: Add potential recipient lookup for other occasion types.
export async function getPotentialRecipients(
  occasion,
  homeId,
) {
  switch (occasion.type) {
    case OCCASION_TYPE.BIRTHDAY:
      return getBirthdayPotentialRecipients(
        occasion,
        homeId,
      );

    default:
      throw new CustomError(
        'ERRORS.UNSUPPORTED_TYPE',
        400,
      );
  }
}
