import { TYPES, STATUSES, MONTHS } from "../../shared/dist/constants/occasions.js";

export function transformOccasionDisplayParts(occasion) {
  const typeMeta = TYPES.find(t => t.id === occasion.type);
  const monthMeta = occasion.month ? MONTHS.find(m => m.id === occasion.month) : null;
  const statusMeta = STATUSES.find(s => s.id === occasion.status);

  return {
    id: occasion.id,
    type: typeMeta.nameKey,
    date: occasion.type === 6 ? typeMeta.dateKey + occasion.year : typeMeta.dateKey,
    monthNameKey: monthMeta ? monthMeta.nameKey : null,
    month: monthMeta ? monthMeta.optionKey : null,
    year: occasion.year,
    status: statusMeta.nameKey,
   // isDeletable: occasion.isDeletable
  };
}
