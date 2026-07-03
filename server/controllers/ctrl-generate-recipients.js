import { Senior, Home, HomeAddress, Region, Recipient } from "../models/index.js";
import { fn, literal, Op, where } from 'sequelize';
import CustomError from "../shared/customError.js";

function getByBirthMonth(month) {
  return where(
    fn('EXTRACT', literal('MONTH FROM "birthDate"')),
    month
  );
}

function getGender(senior) {
  if (senior.patronymic && senior.lastName) {
    if (
      (senior.patronymic.endsWith('ич') ||
        senior.patronymic.endsWith('оглы') ||
        senior.patronymic.endsWith('Оглы')) &&
      (senior.lastName.endsWith('ова') ||
        senior.lastName.endsWith('ева') ||
        senior.lastName.endsWith('ина'))
    )
      return null;
    if (
      (senior.patronymic.endsWith('на') ||
        senior.patronymic.endsWith('кызы') ||
        senior.patronymic.endsWith('Кызы')) &&
      (senior.lastName.endsWith('ов') ||
        senior.lastName.endsWith('ев') ||
        senior.lastName.endsWith('ин'))
    )
      return null;
  }
  if (
    senior.patronymic &&
    (senior.patronymic.endsWith('ич') ||
      senior.patronymic.endsWith('оглы') ||
      senior.patronymic.endsWith('Оглы'))
  )
    return 'male';

  if (
    senior.patronymic &&
    (senior.patronymic.endsWith('на') ||
      senior.patronymic.endsWith('кызы') ||
      senior.patronymic.endsWith('Кызы'))
  )
    return 'female';
  if (
    senior.lastName &&
    (senior.lastName.endsWith('ов') ||
      senior.lastName.endsWith('ев') ||
      senior.lastName.endsWith('ин'))
  )
    return 'male';
  if (
    senior.lastName &&
    (senior.lastName.endsWith('ова') ||
      senior.lastName.endsWith('ева') ||
      senior.lastName.endsWith('ина'))
  )
    return 'female';
  return null;
}

export function fullName(row) {
  const ln = row['lastName'] ?? '';
  const fn = row['firstName'] ?? '';
  const pn = row['patronymic'] ?? '';
  const gender = getGender(row);
  const gc = gender === null ? (row.gender === 'female' ? '/жен./' : '/муж./') : '';//gender === 'female' ? '/жен./' : '/муж./';

  return [ln, fn, pn, gc].filter(Boolean).join(' ').trim();
}



function getAge(y, m) {
  const today = new Date();
  const currentYear = today.getMonth() < m ? today.getFullYear() : today.getFullYear() + 1;
  return currentYear - y;
}

const MAP = {
  male: 'male',
  female: 'female',
  year: (y, m) => {
    const age = getAge(y, m);
    if (age > 69) return 'old_';
    if (age < 40) return 'young_';
    return 'middle_';
  },
  home: (s) => {
    if (s.home.specialHome) return 'spec_';
    if (s.home.noAddress || s.personalNoAddr) return 'ment_';
    return 'gen_';
  }
}

export function getCategory(senior, year, month) {
  return MAP.home(senior) + MAP.year(year, month) + MAP[senior.gender];
}
//TODO: i18n
const YEARS = {
  91: "год",
  92: "года",
  93: "года",
  94: "года",
  96: "лет",
  97: "лет",
  98: "лет",
  99: "лет",
  101: "год",
  102: "года",
  103: "года",
  104: "года",
  106: "лет",
  107: "лет",
  108: "лет",
  109: "лет",
  111: "лет",
  112: "лет",
  113: "лет",
  114: "лет",
  116: "лет",
  117: "лет",
};

export function getSpecialComment(y, m) {
  const age = getAge(y, m);
  if (age % 5 === 0) {
    return `Юбилей ${age} лет!`;
  }
  if (age > 90) {
    return `${age} ${YEARS[age]}!`;
  }
  return '';
}

async function generateBirthdayRecipients(occasion, t, seniorIds) {
  const where = {
    [Op.and]: [
      getByBirthMonth(occasion.month),
      { dateOfExit: null },
      { isRestricted: false }
    ],
  };
  if (seniorIds.length) where[Op.and].push({ id: { [Op.in]: seniorIds } });

  const seniors = await Senior.findAll({
    where,
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    transaction: t,
    include: [
      {
        model: Home,
        as: 'home',
        required: true,
        where: {
          isRestricted: false,
          isClose: false,
        },
        attributes: ['noAddress', 'specialHome', 'acceptableForSchool'],
        include: [
          {
            model: HomeAddress,
            as: 'activeAddress',
            attributes: ['fullPostalAddress'],
            where: { isRestricted: false },
            include: [
              { model: Region, attributes: ['id'] },
            ]
          }
        ]
      }
    ]
  });

  if (!seniors.length) { throw new CustomError('ERRORS.RECIPIENT.SENIORS_NOT_FOUND', 400); }

  const rows = seniors.map(s => {
    const [year, month, day] = s.birthDate.split('-').map(Number);
    return {
      fullNameSnapshot: fullName(s),
      daySnapshot: day,
      monthSnapshot: month,
      yearSnapshot: year !== 1800 ? year : null,
      regionIdSnapshot: s.home.activeAddress.region.id,
      homeIdSnapshot: s.homeId,
      addressSnapshot: s.home.activeAddress.fullPostalAddress,
      category: getCategory(s, year, month),
      specialComment: year !== 1800 ? getSpecialComment(s, occasion.month) : '',
      acceptableForSchool: s.home.acceptableForSchool,
      isAbsent: false,
      plusAmount: 0,
      seniorId: s.id,
      occasionId: occasion.id
    }
  })
  return rows;
}

async function generateNYRecipients(occasion, t) { }
async function generateFebruary23Recipients(occasion, t) { }
async function generateMarch8Recipients(occasion, t) { }
async function generateMay9Recipients(occasion, t) { }
async function generateEasterRecipients(occasion, t) { }

export async function generateRecipients(occasion, t, seniorIds = []) {
  switch (occasion.type) {
    case 1:
      return await generateBirthdayRecipients(occasion, t, seniorIds);
    case 2:
      return await generateNYRecipients(occasion, t);
    case 3:
      return await generateFebruary23Recipients(occasion, t);
    case 4:
      return await generateMarch8Recipients(occasion, t);
    case 5:
      return await generateMay9Recipients(occasion, t);
    case 6:
      return await generateEasterRecipients(occasion, t);
    default:
      throw new CustomError('ERRORS.OCCASION.UNSUPPORTED_TYPE', 400);
  }
}

async function getExistedIds(occasionId, homeId) {
  const ids = await Recipient.findAll({
    where: {
      occasionId,
      homeIdSnapshot: homeId
    },
    attributes: ['seniorId']
  });
  return ids.map(i => i.seniorId);
}

function fullData(row) {
  const fn = row['firstName'] ?? '';
  const pn = row['patronymic'] ?? '';
  const ln = row['lastName'] ?? '';
  const db = row['birthDate'] ?? '';
  return [fn, pn, ln, db].filter(Boolean).join(' ').trim();
}



async function getBirthdayPotentialRecipients(occasion, homeId) {
  const existedIds = await getExistedIds(occasion.id, homeId);

  const seniors = await Senior.findAll({
    where: {
      [Op.and]: [
        getByBirthMonth(occasion.month),
        { dateOfExit: null },
        { isRestricted: false },
        { homeId },
        { id: { [Op.notIn]: existedIds } }
      ],
    },
    attributes: ['id', 'lastName', 'firstName', 'patronymic', 'birthDate'],
  });
  return seniors.map(s => ({ id: s.id, fullData: fullData(s) }));
}

async function getNYPotentialRecipients(occasion, homeId) { }
async function getFebruary23PotentialRecipients(occasion, homeId) { }
async function getMarch8PotentialRecipients(occasion, homeId) { }
async function getMay9PotentialRecipients(occasion, homeId) { }
async function getEasterPotentialRecipients(occasion, homeId) { }

export async function getPotentialRecipients(occasion, homeId) {
  switch (occasion.type) {
    case 1:
      return await getBirthdayPotentialRecipients(occasion, homeId);
    case 2:
      return await getNYPotentialRecipients(occasion, homeId);
    case 3:
      return await getFebruary23PotentialRecipients(occasion, homeId);
    case 4:
      return await getMarch8PotentialRecipients(occasion, homeId);
    case 5:
      return await getMay9PotentialRecipients(occasion, homeId);
    case 6:
      return await getEasterPotentialRecipients(occasion, homeId);
    default:
      throw new CustomError('ERRORS.OCCASION.UNSUPPORTED_TYPE', 400);
  }
}


async function getBirthdaySeniors(occasion, t, seniorIds) {
  const where = {
    [Op.and]: [
      getByBirthMonth(occasion.month),
      { dateOfExit: null },
      { isRestricted: false }
    ],
  };
  if (seniorIds.length) where[Op.and].push({ id: { [Op.in]: seniorIds } });

  return await Senior.findAll({
    where,
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    transaction: t,
    include: [
      {
        model: Home,
        as: 'home',
        required: true,
        where: {
          isRestricted: false,
          isClose: false,
        },
        attributes: ['noAddress', 'specialHome', 'acceptableForSchool'],
        include: [
          {
            model: HomeAddress,
            as: 'activeAddress',
            attributes: ['fullPostalAddress'],
            where: { isRestricted: false },
            include: [
              { model: Region, attributes: ['id'] },
            ]
          }
        ]
      }
    ]
  });
}

async function getNYSeniors(occasion, homeId) { }
async function getFebruary23Seniors(occasion, homeId) { }
async function getMarch8Seniors(occasion, homeId) { }
async function getMay9Seniors(occasion, homeId) { }
async function getEasterSeniors(occasion, homeId) { }

export async function getSeniors(occasion, t, seniorIds = []) {
  switch (occasion.type) {
    case 1:
      return await getBirthdaySeniors(occasion, t, seniorIds);
    case 2:
      return await getNYSeniors(occasion, t);
    case 3:
      return await getFebruary23Seniors(occasion, t);
    case 4:
      return await getMarch8Seniors(occasion, t);
    case 5:
      return await getMay9Seniors(occasion, t);
    case 6:
      return await getEasterSeniors(occasion, t);
    default:
      throw new CustomError('ERRORS.OCCASION.UNSUPPORTED_TYPE', 400);
  }
}


