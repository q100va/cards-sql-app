import {
  OCCASION_TYPES_BY_ID,
  MONTHS_BY_ID,
} from '../../shared/dist/constants/occasions.js';

export function buildOccasionNodes(occasions, lang = 'ru') {
  const locale = lang === 'ru' ? 'ru' : 'en';
  const types = new Map();

  for (const occasion of occasions) {
    const type = Number(occasion.type);
    const month =
      occasion.month == null
        ? null
        : Number(occasion.month);
    const year =
      occasion.year == null
        ? null
        : Number(occasion.year);

    let typeEntry = types.get(type);

    if (!typeEntry) {
      typeEntry = {
        node: {
          key: `${type}`,
          label:
            OCCASION_TYPES_BY_ID[type]?.[locale] ??
            String(type),
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

    // Build month → year branches for monthly occasions.
    if (month !== null) {
      let monthEntry = typeEntry.months.get(month);

      if (!monthEntry) {
        monthEntry = {
          node: {
            key: `${type}-${month}`,
            label:
              MONTHS_BY_ID[month]?.[locale] ??
              String(month),
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

      if (
        year !== null &&
        !monthEntry.years.has(year)
      ) {
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

      continue;
    }

    // Add years directly under annual occasion types.
    if (
      year !== null &&
      !typeEntry.years.has(year)
    ) {
      typeEntry.years.add(year);

      typeEntry.node.children.push({
        key: `${type}-${year}`,
        label: String(year),
        data: {
          type,
          month: null,
          year,
        },
      });
    }
  }

  return [...types.values()].map(({ node }) => node);
}
