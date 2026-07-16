import { literal } from "sequelize";
import {
  Volunteer, VolunteerContact,
  User, Institute, Occasion
} from "../models/index.js";

export const ORDER_STATUSES = {
  1: {
    key: 'ORDER.STATUS.PENDING',
    ru: 'Ожидаема',
    en: 'Pending',
  },
  2: {
    key: 'ORDER.STATUS.ACCEPTED',
    ru: 'Подтверждена',
    en: 'Accepted',
  },
  3: {
    key: 'ORDER.STATUS.RETURNED',
    ru: 'Возвращена',
    en: 'Returned',
  },
  4: {
    key: 'ORDER.STATUS.OVERDUE',
    ru: 'Просрочена',
    en: 'Overdue',
  },
};

//1 - 'SUBS' 2 - 'SITE' 3 - 'VK' 4 - 'TELEGRAM' 5 - 'INSTA' 6 - 'FB' 7 - 'DOBRORU' 8 - 'INFLUENCER' 9 - 'OTHER'

/* export const SOURCES = [
  {
    id: 1,
    optionKey: 'ORDER.CARD.SOURCE.SUBS',
  },
  {
    id: 2,
    optionKey: 'ORDER.CARD.SOURCE.SITE',
  },
  {
    id: 3,
    optionKey: 'ORDER.CARD.SOURCE.VK',
  },
  {
    id: 4,
    optionKey: 'ORDER.CARD.SOURCE.TELEGRAM',
  },
  {
    id: 5,
    optionKey: 'ORDER.CARD.SOURCE.INSTA',
  },
  {
    id: 6,
    optionKey: 'ORDER.CARD.SOURCE.DOBRORU',
  },
  {
    id: 7,
    optionKey: 'ORDER.CARD.SOURCE.INFLUENCER',
  },
  {
    id: 8,
    optionKey: 'ORDER.CARD.SOURCE.OTHER',
  },
]; */

export const ORDER_SOURCES = {
  1: {
    key: 'ORDER.CARD.SOURCE.SUBS',
    ru: 'постоянные',
    en: 'Subscription',
  },
  2: {
    key: 'ORDER.CARD.SOURCE.SITE',
    ru: 'сайт',
    en: 'Website',
  },
  3: {
    key: 'ORDER.CARD.SOURCE.VK',
    ru: 'вконтакте',
    en: 'VK',
  },
  4: {
    key: 'ORDER.CARD.SOURCE.TELEGRAM',
    ru: 'телеграм',
    en: 'Telegram',
  },
  5: {
    key: 'ORDER.CARD.SOURCE.INSTA',
    ru: 'инста',
    en: 'Instagram',
  },
  6: {
    key: 'ORDER.CARD.SOURCE.DOBRORU',
    ru: 'добро.ру',
    en: 'Dobro.ru',
  },
  7: {
    key: 'ORDER.CARD.SOURCE.INFLUENCER',
    ru: 'блогер',
    en: 'Influencer',
  },
  8: {
    key: 'ORDER.CARD.SOURCE.OTHER',
    ru: 'другое',
    en: 'Other',
  },
}
export const RECIPIENT_STATUS = {
  1: 'ORDER.CARD.RECIPIENT_STATUS.PRESENT',
  2: 'ORDER.CARD.RECIPIENT_STATUS.ABSENT',
  3: 'ORDER.CARD.RECIPIENT_STATUS.DELETED',
};

const orderSortFields = {
  userName: [{ model: User, as: 'user' }, 'userName'],
  date: 'createdAt',
  amount: 'amount',
  volunteerName: [{ model: Volunteer, as: 'volunteer' }, 'lastName'],
  //status: 'status',
  //source: 'source',
  //occasionName: 'occasionId',
  instituteName: [
    { model: Institute, as: 'institute' },
    'instituteName'],
  contact: [
    { model: VolunteerContact, as: 'contact' },
    'content'],//TODO: add sorting by 'type'
};

function getTranslatedOrderStatus(status, lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  return ORDER_STATUSES[status]?.[locale] ?? '';
}
function getTranslatedOrderSource(source, lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  return ORDER_SOURCES[source]?.[locale] ?? '';
}

export function getOrderStatusSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';

  const statuses = [1, 2, 3, 4];

  const sortedStatuses = statuses.sort((statusA, statusB) =>
    getTranslatedOrderStatus(statusA, locale).localeCompare(
      getTranslatedOrderStatus(statusB, locale),
      locale,
    ),
  );
  console.log('sortedStatuses');
  console.log(sortedStatuses);
  const cases = sortedStatuses
    .map((status, index) => `WHEN ${status} THEN ${index}`)
    .join(' ');

  return literal(`
    CASE "order"."status"
      ${cases}
      ELSE 999
    END
  `);
}

export function getOrderSourceSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';

  const sources = [1, 2, 3, 4, 5, 6, 7, 8];

  const sortedSources = sources.sort((sourceA, sourceB) =>
    getTranslatedOrderSource(sourceA, locale).localeCompare(
      getTranslatedOrderSource(sourceB, locale),
      locale,
    ),
  );
  const cases = sortedSources
    .map((source, index) => `WHEN ${source} THEN ${index}`)
    .join(' ');

  return literal(`
    CASE "order"."source"
      ${cases}
      ELSE 999
    END
  `);
}

export function getOrderSortField(sortField) {
  const field = Array.isArray(sortField) ? sortField[0] : sortField;
  return orderSortFields[field] ?? 'createdAt';
}

export const OCCASION_TYPES = {
  1: {
    key: 'OCCASION.TYPE.BIRTHDAY.NAME',
    ru: 'Дни рождения',
    en: 'Birthdays',
  },
  2: {
    key: 'OCCASION.TYPE.NEW_YEAR.NAME',
    ru: 'Новый год',
    en: 'New Year',
  },
  3: {
    key: 'OCCASION.TYPE.FEBRUARY_23.NAME',
    ru: '23 февраля',
    en: "Defender of the Fatherland Day",
  },
  4: {
    key: 'OCCASION.TYPE.MARCH_8.NAME',
    ru: '8 Марта',
    en: "International Women's Day",
  },
   5: {
    key: 'OCCASION.TYPE.MAY_9.NAME',
    ru: 'День Победы',
    en: "Victory Day",
  },
   6: {
    key: 'OCCASION.TYPE.EASTER.NAME',
    ru: 'Пасха',
    en: "Easter",
  },
};

export const MONTHS = {
  1: { ru: 'Январь', en: 'January' },
  2: { ru: 'Февраль', en: 'February' },
  3: { ru: 'Март', en: 'March' },
  4: { ru: 'Апрель', en: 'April' },
  5: { ru: 'Май', en: 'May' },
  6: { ru: 'Июнь', en: 'June' },
  7: { ru: 'Июль', en: 'July' },
  8: { ru: 'Август', en: 'August' },
  9: { ru: 'Сентябрь', en: 'September' },
  10: { ru: 'Октябрь', en: 'October' },
  11: { ru: 'Ноябрь', en: 'November' },
  12: { ru: 'Декабрь', en: 'December' },
};

export function getOccasionTypeSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';

  const sortedTypes = Object.keys(OCCASION_TYPES).sort((typeA, typeB) =>
    OCCASION_TYPES[typeA][locale].localeCompare(
      OCCASION_TYPES[typeB][locale],
      locale,
    ),
  );

  const cases = sortedTypes
    .map(
      (type, index) =>
        `WHEN ${type} THEN ${index}`,
    )
    .join(' ');

  return literal(`
    CASE "occasion"."type"
      ${cases}
      ELSE 999
    END
  `);
}

export function getOccasionMonthSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';

  const sortedMonths = Object.keys(MONTHS)
    .map(Number)
    .sort((monthA, monthB) =>
      MONTHS[monthA][locale].localeCompare(
        MONTHS[monthB][locale],
        locale,
      ),
    );

  const cases = sortedMonths
    .map((month, index) => `WHEN ${month} THEN ${index}`)
    .join(' ');

  return literal(`
    CASE "occasion"."month"
      ${cases}
      ELSE 999
    END
  `);
}


