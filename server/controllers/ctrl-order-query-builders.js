import { literal } from 'sequelize';
import {
  Volunteer,
  VolunteerContact,
  User,
  Institute,
} from '../models/index.js';

import {
  OCCASION_TYPES,
  MONTHS,
} from '../../shared/dist/constants/occasions.js';

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

export function dictToOptions(dict, lang) {
  return Object.entries(dict)
    .map(([value, item]) => ({
      label: item[lang],
      value: Number(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

export function getOccasionTypeSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';

  const sortedTypes = [...OCCASION_TYPES].sort((a, b) =>
    a[locale].localeCompare(b[locale], locale),
  );

  const cases = sortedTypes
    .map(
      (type, index) =>
        `WHEN ${type.id} THEN ${index}`,
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

  const sortedMonths = [...MONTHS].sort((a, b) =>
    a[locale].localeCompare(b[locale], locale),
  );

  const cases = sortedMonths
    .map(
      (month, index) =>
        `WHEN ${month.id} THEN ${index}`,
    )
    .join(' ');

  return literal(`
    CASE "occasion"."month"
      ${cases}
      ELSE 999
    END
  `);
}
