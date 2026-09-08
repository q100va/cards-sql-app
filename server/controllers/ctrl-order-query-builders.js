import { literal, Op } from 'sequelize';
import {
  Volunteer,
  VolunteerContact,
  User,
  Institute,
  Occasion
} from '../models/index.js';
import {
  OCCASION_TYPES,
  MONTHS,
  OCCASION_TYPE,
} from '../../shared/dist/constants/occasions.js';
import {
  ORDER_STATUSES,
  ORDER_SOURCES,
} from '../../shared/dist/constants/orders.js';
import { escapeLikeValue } from './ctrl-common-helpers.js';
import { applyDateFilter, applyNumericFilter, applyStringFilter } from "./ctrl-apply-filter.js";

export const ORDER_LIST_INCLUDE = [
  {
    model: User,
    as: 'user',
    attributes: ['id', 'userName'],
  },
  {
    model: Volunteer,
    as: 'volunteer',
    attributes: ['id', 'firstName', 'patronymic', 'lastName'],
  },
  {
    model: Institute,
    as: 'institute',
    attributes: ['id', 'instituteName', 'category'],
    required: false,
  },
  {
    model: VolunteerContact,
    as: 'contact',
    attributes: ['id', 'content', 'type'],
    required: false,
  },
  {
    model: Occasion,
    as: 'occasion',
    attributes: ['id', 'type', 'month', 'year', 'amount', 'status'],
  },
];

const ORDER_SORT_FIELDS = {
  userName: [{ model: User, as: 'user' }, 'userName'],
  date: 'createdAt',
  amount: 'amount',
  volunteerName: [{ model: Volunteer, as: 'volunteer' }, 'lastName'],
  instituteName: [
    { model: Institute, as: 'institute' },
    'instituteName'],
  contact: [
    { model: VolunteerContact, as: 'contact' },
    'content'],
  //TODO: Add contact type to sorting.
};

function getTranslatedOrderStatus(status, lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  return ORDER_STATUSES[status]?.[locale] ?? '';
}

function getTranslatedOrderSource(source, lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  return ORDER_SOURCES[source]?.[locale] ?? '';
}

function getOrderStatusSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  const statuses = Object.keys(ORDER_STATUSES).map(Number);
  const sortedStatuses = statuses.sort((statusA, statusB) =>
    getTranslatedOrderStatus(statusA, locale).localeCompare(
      getTranslatedOrderStatus(statusB, locale),
      locale,
    ),
  );
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

function getOrderSourceSortExpression(lang = 'en') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  const sources = Object.keys(ORDER_SOURCES).map(Number);
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

function getOccasionTypeSortExpression(lang = 'en') {
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

function getOccasionMonthSortExpression(lang = 'en') {
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

export function buildOrderSort(
  sortField,
  sortOrder,
  lang,
) {
  const sortKey = Array.isArray(sortField)
    ? sortField[0]
    : sortField;

  const dir =
    sortKey
      ? sortOrder === 1
        ? 'ASC'
        : 'DESC'
      : 'DESC';

  const field = ORDER_SORT_FIELDS[sortKey] ?? 'createdAt';

  if (sortKey === 'status') {
    return [
      [getOrderStatusSortExpression(lang), dir],
      ['id', 'ASC'],
    ];
  }

  if (sortKey === 'source') {
    return [
      [getOrderSourceSortExpression(lang), dir],
      ['id', 'ASC'],
    ];
  }

  if (sortKey === 'occasionName') {
    return [
      [getOccasionTypeSortExpression(lang), dir],
      [getOccasionMonthSortExpression(lang), dir],
      [{ model: Occasion, as: 'occasion' }, 'year', dir],
      ['id', 'ASC'],
    ];
  }

  if (Array.isArray(field)) {
    return [
      [...field, dir],
      ['id', 'ASC'],
    ];
  }

  return [
    [field, dir],
    ['id', 'ASC'],
  ];
}

function applyMultiFieldSearch(where, value, fields) {
  const words = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return;

  where[Op.and] ??= [];

  where[Op.and].push(
    ...words.map((word) => {
      const searchValue = `%${escapeLikeValue(word)}%`;

      return {
        [Op.or]: fields.map((field) => ({
          [field]: {
            [Op.iLike]: searchValue,
          },
        })),
      };
    }),
  );
}

function applyOccasionFilter(
  where,
  occasionNodes,
) {
  if (!occasionNodes?.length) return;
  const validNodes = occasionNodes.filter(
    (item) =>
      item.year != null &&
      (
        item.type !== OCCASION_TYPE.BIRTHDAY ||
        item.month != null
      ),
  );

  if (!validNodes.length) return;
  where[Op.and] ??= [];

  where[Op.and].push({
    [Op.or]: validNodes.map((node) => ({
      [Op.and]: [
        { '$occasion.type$': node.type },
        { '$occasion.month$': node.month },
        { '$occasion.year$': node.year },
      ],
    })),
  });

}

function applyOrderGlobalSearch(
  where,
  searchValue,
) {
  const search = String(searchValue ?? '').trim();

  if (!search) return;

  const value = `%${escapeLikeValue(search)}%`;

  where[Op.and] ??= [];

  where[Op.and].push({
    [Op.or]: [
      { comment: { [Op.iLike]: value } },
      { '$user.userName$': { [Op.iLike]: value } },
      { '$volunteer.firstName$': { [Op.iLike]: value } },
      { '$volunteer.lastName$': { [Op.iLike]: value } },
      { '$volunteer.patronymic$': { [Op.iLike]: value } },
      { '$institute.instituteName$': { [Op.iLike]: value } },
      { '$institute.category$': { [Op.iLike]: value } },
      { '$contact.content$': { [Op.iLike]: value } },
      { '$contact.type$': { [Op.iLike]: value } },
    ],
  });
}

export function applyOrderFilters(
  where,
  filters,
  searchValue,
) {
  applyNumericFilter(where, filters, 'amount');
  applyStringFilter(where, filters, 'comment');
  applyNumericFilter(where, filters, 'userId');
  applyNumericFilter(where, filters, 'status');
  applyNumericFilter(where, filters, 'source');
  applyDateFilter(where, filters, 'date');

  applyMultiFieldSearch(
    where,
    filters.volunteerName?.[0]?.value,
    [
      '$volunteer.firstName$',
      '$volunteer.lastName$',
      '$volunteer.patronymic$',
    ],
  );

  applyMultiFieldSearch(
    where,
    filters.instituteName?.[0]?.value,
    [
      '$institute.instituteName$',
      '$institute.category$',
    ],
  );

  applyMultiFieldSearch(
    where,
    filters.contact?.[0]?.value,
    [
      '$contact.content$',
      '$contact.type$',
    ],
  );

  applyOccasionFilter(
    where,
    filters.occasionName?.[0]?.value,
  );

  applyOrderGlobalSearch(
    where,
    searchValue,
  );
}

export function dictToOptions(dict, lang) {
  return Object.entries(dict)
    .map(([value, item]) => ({
      label: item[lang],
      value: Number(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}
