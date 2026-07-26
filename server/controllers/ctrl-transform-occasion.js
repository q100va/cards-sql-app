import { TYPES, STATUSES, MONTHS } from "../../shared/dist/constants/occasions.js";
import { OCCASION_TYPES, MONTHS as OCCASION_MONTHS } from "./ctrl-order-query-builders.js";

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
    amount: occasion.amount,
    status: statusMeta.nameKey,
    // isDeletable: occasion.isDeletable
  };
}

export function buildOccasionNodes(occasions, lang = 'ru') {
  const types = new Map();

  for (const occasion of occasions) {
    const type = Number(occasion.type);
    const month =
      occasion.month == null ? null : Number(occasion.month);
    const year =
      occasion.year == null ? null : Number(occasion.year);

    let typeEntry = types.get(type);

    if (!typeEntry) {
      typeEntry = {
        node: {
          key: `${type}`,
          label: OCCASION_TYPES[type]?.[lang] ?? String(type),
          data: {
            type,
            month: null,
            year: null,
          },
          children: [],
        },
        months: new Map(),
        years: new Set(),
      };

      types.set(type, typeEntry);
    }

    if (month !== null) {
      let monthEntry = typeEntry.months.get(month);

      if (!monthEntry) {
        monthEntry = {
          node: {
            key: `${type}-${month}`,
            label: OCCASION_MONTHS[month]?.[lang] ?? String(month),
            data: {
              type,
              month,
              year: null,
            },
            children: [],
          },
          years: new Set(),
        };

        typeEntry.months.set(month, monthEntry);
        typeEntry.node.children.push(monthEntry.node);
      }

      if (year !== null && !monthEntry.years.has(year)) {
        monthEntry.years.add(year);

        monthEntry.node.children.push({
          key: `${type}-${month}-${year}`,
          label: String(year),
          data: {
            type,
            month,
            year,
          },
        });
      }
    } else if (
      year !== null &&
      !typeEntry.years.has(year)
    ) {
      typeEntry.years.add(year);

      typeEntry.node.children.push({
        key: `${type}-${month}-${year}`,
        label: String(year),
        data: {
          type,
          month,
          year,
        },
      });
    }
  }

  return [...types.values()].map(({ node }) => node);
}
