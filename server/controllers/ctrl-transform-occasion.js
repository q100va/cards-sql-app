import {
  OCCASION_TYPE,
  OCCASION_TYPES_BY_ID,
  MONTHS_BY_ID,
  STATUSES_BY_ID,
} from '../../shared/dist/constants/occasions.js';

export function transformOccasionDisplayParts(occasion) {
  const typeMeta = OCCASION_TYPES_BY_ID[occasion.type];
  const monthMeta =
    occasion.month != null
      ? MONTHS_BY_ID[occasion.month]
      : null;
  const statusMeta = STATUSES_BY_ID[occasion.status];

  return {
    id: occasion.id,
    type: typeMeta.nameKey,
    date:
      occasion.type === OCCASION_TYPE.EASTER
        ? `${typeMeta.dateKey}${occasion.year}`
        : typeMeta.dateKey,
    monthNameKey: monthMeta?.nameKey ?? null,
    month: monthMeta?.optionKey ?? null,
    year: occasion.year,
    amount: occasion.amount,
    status: statusMeta.nameKey,
  };
}
