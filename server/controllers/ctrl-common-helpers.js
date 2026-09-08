import { fn, literal, Op, where } from 'sequelize';

export function getByBirthMonth(month) {
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

export function buildFullName(senior) {
  const lastName = senior.lastName ?? '';
  const firstName = senior.firstName ?? '';
  const patronymic = senior.patronymic ?? '';

  const gender = getGender(senior);
  const genderComment =
    gender === null
      ? senior.gender === 'female'
        ? '/жен./'
        : '/муж./'
      : '';

  return [
    lastName,
    firstName,
    patronymic,
    genderComment,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getAge(birthYear, occasionYear) {
  return occasionYear - birthYear;
}

const MAP = {
  male: 'male',
  female: 'female',
  year: (birthYear, occasionYear) => {
    const age = getAge(birthYear, occasionYear);
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

export function getCategory(senior, birthYear, occasionYear) {
  return MAP.home(senior) + MAP.year(birthYear, occasionYear) + MAP[senior.gender];
}
// TODO: Move generated comments to i18n.
function getYearsWord(age) {
  const lastTwo = age % 100;
  const last = age % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'лет';
  }

  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';

  return 'лет';
}

export function getSpecialComment(birthYear, occasionYear) {
  const age = getAge(birthYear, occasionYear);
  if (age % 5 === 0) {
    return `Юбилей ${age} лет!`;
  }
  if (age > 90) {
    return `${age} ${getYearsWord(age)}!`;
  }
  return '';
}

// Escape SQL LIKE wildcard characters.
export function escapeLikeValue(value) {
  return String(value).replace(/([_%\\])/g, '\\$1');
}
