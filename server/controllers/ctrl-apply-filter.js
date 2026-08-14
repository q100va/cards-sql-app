import { Op } from 'sequelize';
import CustomError from '../shared/customError.js';

const NUMERIC_OPERATIONS = {
  equals: Op.eq,
  notEquals: Op.ne,
  lt: Op.lt,
  lte: Op.lte,
  gt: Op.gt,
  gte: Op.gte,
  in: Op.in,
};

const STRING_OPERATIONS = {
  contains: Op.iLike,
  notContains: Op.notILike,
  equals: Op.eq,
  notEquals: Op.ne,
  startsWith: Op.iLike,
  endsWith: Op.iLike,
};

const WHERE_KEYS = {
  fullName: 'fullNameSnapshot',
  birthDay: 'daySnapshot',
  birthMonth: 'monthSnapshot',
  birthYear: 'yearSnapshot',
  plusAmount: 'plusAmount',
  category: 'category',
  specialComment: 'specialComment',
  regionName: 'name',
  homeName: 'homeName',
  date: 'createdAt',
  userId: 'userId',
  amount: 'amount',
  status: 'status',
  source: 'source',
  comment: 'comment',
};

function getWhereKey(field) {
  const key = WHERE_KEYS[field];

  if (!key) {
    throw new CustomError(
      'ERRORS.INVALID_FILTER_VALUE',
      400,
    );
  }

  return key;
}

function getLogicalOperator(operator) {
  if (operator === 'and') return Op.and;
  if (operator === 'or') return Op.or;

  throw new CustomError(
    'ERRORS.INVALID_FILTER_VALUE',
    400,
  );
}

function getNumericValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new CustomError(
      'ERRORS.INVALID_FILTER_VALUE',
      400,
    );
  }

  return numericValue;
}

function getNumericFilterValue(filter) {
  if (filter.matchMode === 'in') {
    if (!Array.isArray(filter.value) || !filter.value.length) {
      throw new CustomError(
        'ERRORS.INVALID_FILTER_VALUE',
        400,
      );
    }

    const values = filter.value.map(Number);

    if (values.some((value) => !Number.isFinite(value))) {
      throw new CustomError(
        'ERRORS.INVALID_FILTER_VALUE',
        400,
      );
    }

    return values;
  }

  return getNumericValue(filter.value);
}

// Escape SQL LIKE wildcard characters.
export function escapeLikeValue(value) {
  return String(value).replace(/([_%\\])/g, '\\$1');
}

function getDayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function applyNumericFilter(where, filters, field) {
  const fieldFilters = filters[field];

  if (!fieldFilters?.length) return;

  const key = getWhereKey(field);

  const buildCondition = (filter) => {
    const op = NUMERIC_OPERATIONS[filter.matchMode];

    if (!op) {
      throw new CustomError(
        'ERRORS.INVALID_FILTER_MATCH_MODE',
        400,
      );
    }

    const value = getNumericFilterValue(filter);

    return {
      [op]: value,
    };
  };

  if (fieldFilters.length === 1) {
    where[key] = buildCondition(fieldFilters[0]);
    return;
  }

  const operator = getLogicalOperator(
    fieldFilters[0].operator,
  );

  where[key] = {
    [operator]: fieldFilters.map(buildCondition),
  };
}

export function applyStringFilter(where, filters, field) {
  const fieldFilters = filters[field];

  if (!fieldFilters?.length) return;

  const key = getWhereKey(field);

  const buildCondition = (filter) => {
    const op = STRING_OPERATIONS[filter.matchMode];

    if (!op) {
      throw new CustomError(
        'ERRORS.INVALID_FILTER_MATCH_MODE',
        400,
      );
    }

    const rawValue = String(filter.value ?? '').trim();

    if (!rawValue) {
      throw new CustomError(
        'ERRORS.INVALID_FILTER_VALUE',
        400,
      );
    }

    const escapedValue = escapeLikeValue(rawValue);

    switch (filter.matchMode) {
      case 'contains':
      case 'notContains':
        return {
          [op]: `%${escapedValue}%`,
        };

      case 'startsWith':
        return {
          [op]: `${escapedValue}%`,
        };

      case 'endsWith':
        return {
          [op]: `%${escapedValue}`,
        };

      case 'equals':
      case 'notEquals':
        return {
          [op]: rawValue,
        };

      default:
        throw new CustomError(
          'ERRORS.INVALID_FILTER_MATCH_MODE',
          400,
        );
    }
  };

  if (fieldFilters.length === 1) {
    where[key] = buildCondition(fieldFilters[0]);
    return;
  }

  const operator = getLogicalOperator(
    fieldFilters[0].operator,
  );

  where[key] = {
    [operator]: fieldFilters.map(buildCondition),
  };
}

export function applyDateFilter(where, filters, field) {
  const fieldFilters = filters[field];

  if (!fieldFilters?.length) return;

  const key = getWhereKey(field);

  const buildCondition = (filter) => {
    const date = new Date(filter.value);

    if (Number.isNaN(date.getTime())) {
      throw new CustomError(
        'ERRORS.INVALID_FILTER_VALUE',
        400,
      );
    }

    switch (filter.matchMode) {
      case 'dateIs': {
        const { start, end } = getDayRange(date);

        return {
          [Op.between]: [start, end],
        };
      }

      case 'dateIsNot': {
        const { start, end } = getDayRange(date);

        return {
          [Op.notBetween]: [start, end],
        };
      }

      case 'dateBefore':
        return {
          [Op.lt]: date,
        };

      case 'dateAfter':
        return {
          [Op.gt]: date,
        };

      default:
        throw new CustomError(
          'ERRORS.INVALID_FILTER_MATCH_MODE',
          400,
        );
    }
  };

  if (fieldFilters.length === 1) {
    where[key] = buildCondition(fieldFilters[0]);
    return;
  }

  const operator = getLogicalOperator(
    fieldFilters[0].operator,
  );

  where[key] = {
    [operator]: fieldFilters.map(buildCondition),
  };
}
