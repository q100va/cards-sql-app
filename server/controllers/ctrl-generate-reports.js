import CustomError from '../shared/customError.js';

import {
  MONTHS,
  OCCASION_TYPES_BY_ID,
} from '../../shared/dist/constants/occasions.js';

import {
  REPORT_FREQUENCY,
  REPORT_TYPE,
} from '../../shared/dist/constants/reports.js';

import {
  ORDER_SOURCE,
} from '../../shared/dist/constants/orders.js';

// TODO: Replace institute category names with shared constants.
const SCHOOL_CATEGORIES = new Set([
  'дошкольное ОУ',
  'школа',
  'профессиональное ОУ',
  'ВУЗ',
  'Preschool',
  'School',
  'College',
  'University',
]);

export function getSelectedDateRanges(selection) {
  switch (selection.frequency) {
    case REPORT_FREQUENCY.MONTHLY:
      return selection.years.flatMap((year) =>
        selection.months.map((month) => ({
          startDate: new Date(
            Date.UTC(year, month - 1, 1),
          ),
          endDate: new Date(
            Date.UTC(year, month, 1),
          ),
        })),
      );

    case REPORT_FREQUENCY.QUARTERLY:
      return selection.years.flatMap((year) =>
        selection.quarters.map((quarter) => {
          const startMonth = (quarter - 1) * 3;

          return {
            startDate: new Date(
              Date.UTC(year, startMonth, 1),
            ),
            endDate: new Date(
              Date.UTC(year, startMonth + 3, 1),
            ),
          };
        }),
      );

    case REPORT_FREQUENCY.ANNUAL:
      return selection.years.map((year) => ({
        startDate: new Date(
          Date.UTC(year, 0, 1),
        ),
        endDate: new Date(
          Date.UTC(year + 1, 0, 1),
        ),
      }));

    default:
      throw new CustomError(
        'ERRORS.UNSUPPORTED_TYPE',
        422,
      );
  }
}

const ALGORITHM = {
  [REPORT_TYPE.GENERAL]: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    institutesCount: group.institutesCount.size,
    schoolsCount: group.schoolsCount.size,
    seniorsCount: group.seniorsCount.size,
    homesCount: group.homesCount.size,
    regionsCount: group.regionsCount.size,
    occasions: Array.from(group.occasions.values(), (occasion) => ({
      ...occasion,
      seniorsCount: occasion.seniorsCount.size,
    })),
  })),
  [REPORT_TYPE.PERSONAL]: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    seniorsCount: group.seniorsCount.size,
    institutesCount: group.institutesCount.size,
  })),
  [REPORT_TYPE.SCHOOL_COORDINATION]: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    schoolsCount: group.schoolsCount.size,
    newSchoolsCount: group.newSchoolsCount.size,
  })),
  [REPORT_TYPE.BY_OCCASION]: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    seniorsCount: group.seniorsCount.size,
    institutesCount: group.institutesCount.size,
    schoolsCount: group.schoolsCount.size,
    homesCount: group.homesCount.size,
    regionsCount: group.regionsCount.size,
  })),
};

function getOccasionName(occasion) {
  const typeNameKey =
    OCCASION_TYPES_BY_ID[occasion.type].nameKey;

  const monthNameKey = occasion.month
    ? MONTHS.find(
      (month) => month.id === occasion.month,
    )?.nameKey
    : null;

  return [
    typeNameKey,
    monthNameKey,
    occasion.year,
  ]
    .filter(Boolean)
    .join(' ');
}

// TODO: Add empty periods if reports must include periods without orders.

export function getReportByPeriods(
  type,
  orders,
  frequency,
) {
  const groups = new Map();

  for (const order of orders) {
    const createdAt = new Date(order.createdAt);

    const year = createdAt.getUTCFullYear();
    const month = createdAt.getUTCMonth() + 1;
    const quarter = Math.ceil(month / 3);

    let key;
    let periodData;

    switch (frequency) {
      case REPORT_FREQUENCY.MONTHLY:
        key = `${year}-${month}`;
        periodData = {
          year,
          month,
        };
        break;

      case REPORT_FREQUENCY.QUARTERLY:
        key = `${year}-Q${quarter}`;
        periodData = {
          year,
          quarter,
        };
        break;

      case REPORT_FREQUENCY.ANNUAL:
        key = `${year}`;
        periodData = {
          year,
        };
        break;

      default:
        throw new CustomError(
          'ERRORS.UNSUPPORTED_TYPE',
          422,
        );
    }

    const existingGroup = groups.get(key);

    // A school is new if it was created in the reported period.
    let instKey;

    if (
      type === REPORT_TYPE.SCHOOL_COORDINATION &&
      order.institute?.createdAt
    ) {
      const instCreatedAt = new Date(
        order.institute.createdAt,
      );

      const instYear =
        instCreatedAt.getUTCFullYear();

      const instMonth =
        instCreatedAt.getUTCMonth() + 1;

      const instQuarter =
        Math.ceil(instMonth / 3);

      switch (frequency) {
        case REPORT_FREQUENCY.MONTHLY:
          instKey = `${instYear}-${instMonth}`;
          break;

        case REPORT_FREQUENCY.QUARTERLY:
          instKey =
            `${instYear}-Q${instQuarter}`;
          break;

        case REPORT_FREQUENCY.ANNUAL:
          instKey = `${instYear}`;
          break;
      }
    }

    if (type === REPORT_TYPE.GENERAL) {
      const seniors = [];
      const homes = [];
      const regions = [];

      for (const recipient of order.orderRecipients) {
        seniors.push(recipient.seniorId);
        homes.push(recipient.homeId);
        regions.push(recipient.recipient.regionIdSnapshot);
      }

      const updateOccasion = (occasions) => {
        let occasion = occasions.get(order.occasionId);
        if (!occasion) {
          occasion = {
            occasionId: order.occasionId,
            occasionName: getOccasionName(order.occasion),
            recipientsCount: 0,
            seniorsCount: new Set(),
          };
          occasions.set(order.occasionId, occasion);
        }
        occasion.recipientsCount += Number(order.amount);
        for (const seniorId of seniors) {
          occasion.seniorsCount.add(seniorId);
        }
      };

      if (existingGroup) {
        existingGroup.recipientsCount += Number(order.amount);
        existingGroup.volunteersCount.add(order.volunteerId);
        if (order.instituteId) {
          existingGroup.institutesCount.add(order.instituteId);
          if (SCHOOL_CATEGORIES.has(
            order.institute.category,
          )) {
            existingGroup.schoolsCount.add(order.instituteId);
          }
        }
        for (const seniorId of seniors) {
          existingGroup.seniorsCount.add(seniorId);
        }
        for (const homeId of homes) {
          existingGroup.homesCount.add(homeId);
        }
        for (const regionId of regions) {
          existingGroup.regionsCount.add(regionId);
        }
        updateOccasion(existingGroup.occasions);
      } else {
        const occasions = new Map();
        updateOccasion(occasions);
        groups.set(key, {
          key,
          periodData,
          recipientsCount: Number(order.amount),
          volunteersCount: new Set([order.volunteerId]),
          institutesCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
          schoolsCount: (order.instituteId && SCHOOL_CATEGORIES.has(
            order.institute.category,
          )) ? new Set([order.instituteId]) : new Set(),
          seniorsCount: new Set(seniors),
          homesCount: new Set(homes),
          regionsCount: new Set(regions),
          occasions,

        });
      }
    }

    if (type === REPORT_TYPE.PERSONAL) {
      const seniors = [];

      for (const recipient of order.orderRecipients) {
        seniors.push(recipient.seniorId);
      }

      if (existingGroup) {
        existingGroup.ordersCount += 1;
        existingGroup.recipientsCount += Number(order.amount);
        for (const seniorId of seniors) {
          existingGroup.seniorsCount.add(seniorId);
        }
        existingGroup.volunteersCount.add(order.volunteerId);
        if (order.instituteId) {
          existingGroup.institutesCount.add(order.instituteId);
        }
      } else {
        groups.set(key, {
          key,
          periodData,
          ordersCount: 1,
          recipientsCount: Number(order.amount),
          seniorsCount: new Set(seniors),
          volunteersCount: new Set([order.volunteerId]),
          institutesCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
        });
      }
    }

    if (type === REPORT_TYPE.SCHOOL_COORDINATION) {
      if (existingGroup) {
        existingGroup.ordersCount += 1;
        if (order.source === ORDER_SOURCE.DOBRORU) {
          existingGroup.dobroruCount += 1;
        }
        existingGroup.recipientsCount += Number(order.amount);
        existingGroup.volunteersCount.add(order.volunteerId);
        if (order.instituteId) {
          existingGroup.schoolsCount.add(order.instituteId);
          if (instKey === key) existingGroup.newSchoolsCount.add(order.instituteId);
        }
      } else {
        groups.set(key, {
          key,
          periodData,
          ordersCount: 1,
          dobroruCount: order.source === ORDER_SOURCE.DOBRORU ? 1 : 0,
          recipientsCount: Number(order.amount),
          volunteersCount: new Set([order.volunteerId]),
          schoolsCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
          newSchoolsCount: order.instituteId && instKey === key ? new Set([order.instituteId]) : new Set(),
        });
      }
    }
  }

  const groupedOrders = ALGORITHM[type](groups);

  return groupedOrders.sort((a, b) => {
    const yearDifference =
      a.periodData.year - b.periodData.year;

    if (yearDifference !== 0) {
      return yearDifference;
    }

    if (frequency === REPORT_FREQUENCY.MONTHLY) {
      return (
        (a.periodData.month ?? 0) -
        (b.periodData.month ?? 0)
      );
    }

    if (frequency === REPORT_FREQUENCY.QUARTERLY) {
      return (
        (a.periodData.quarter ?? 0) -
        (b.periodData.quarter ?? 0)
      );
    }

    return 0;
  });
}

export function getReportByOccasion(orders) {
  const groups = new Map();

  for (const order of orders) {
    const seniors = [];
    const homes = [];
    const regions = [];

    for (const recipient of order.orderRecipients) {
      seniors.push(recipient.seniorId);
      homes.push(recipient.homeId);
      regions.push(recipient.recipient.regionIdSnapshot);
    }

    const existingGroup = groups.get(order.occasionId);

    if (existingGroup) {
      existingGroup.ordersCount += 1;
      existingGroup.recipientsCount += Number(order.amount);
      existingGroup.volunteersCount.add(order.volunteerId);
      if (order.instituteId) {
        existingGroup.institutesCount.add(order.instituteId);
        if (SCHOOL_CATEGORIES.has(
          order.institute.category,
        )) {
          existingGroup.schoolsCount.add(order.instituteId);
        }
      }
      for (const seniorId of seniors) {
        existingGroup.seniorsCount.add(seniorId);
      }
      for (const homeId of homes) {
        existingGroup.homesCount.add(homeId);
      }
      for (const regionId of regions) {
        existingGroup.regionsCount.add(regionId);
      }
    } else {
      groups.set(order.occasionId, {
        key: order.occasionId,
        occasionName: getOccasionName(order.occasion),
        ordersCount: 1,
        recipientsCount: Number(order.amount),
        volunteersCount: new Set([order.volunteerId]),
        institutesCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
        schoolsCount: (order.instituteId && SCHOOL_CATEGORIES.has(
          order.institute.category,
        )) ? new Set([order.instituteId]) : new Set(),
        seniorsCount: new Set(seniors),
        homesCount: new Set(homes),
        regionsCount: new Set(regions),

      });
    }
  }
  return ALGORITHM[REPORT_TYPE.BY_OCCASION](groups);
}

export function getStatistic(recipients) {
  const groups = new Map();

  for (const recipient of recipients) {

    const isParticular = recipient.category.startsWith('ment') ||
      recipient.category.startsWith('spec');

    const plusAmount = recipient.plusAmount;

    const existingGroup = groups.get(recipient.occasionId);

    if (existingGroup) {
      existingGroup.allRecipients += 1;
      if (isParticular)
        existingGroup.partRecipients += 1;
      if (plusAmount === 0) {
        existingGroup.zeroAll += 1;
        if (isParticular) existingGroup.zeroPart += 1;
      } else if (plusAmount === 1) {
        existingGroup.onceAll += 1;
        if (isParticular) existingGroup.oncePart += 1;
      } else if (plusAmount === 2) {
        existingGroup.twiceAll += 1;
        if (isParticular) existingGroup.twicePart += 1;
      } else if (plusAmount === 3) {
        existingGroup.threeTimesAll += 1;
        if (isParticular) existingGroup.threeTimesPart += 1;
      } else if (plusAmount > 3) {
        existingGroup.fourTimesOrMoreAll += 1;
        if (isParticular) {
          existingGroup.fourTimesOrMorePart += 1;
        }
      }

    } else {
      groups.set(recipient.occasionId, {
        key: recipient.occasionId,
        occasionName: getOccasionName(recipient.occasion),
        allRecipients: 1,
        partRecipients: isParticular ? 1 : 0,
        zeroAll: plusAmount === 0 ? 1 : 0,
        onceAll: plusAmount === 1 ? 1 : 0,
        twiceAll: plusAmount === 2 ? 1 : 0,
        threeTimesAll: plusAmount === 3 ? 1 : 0,
        fourTimesOrMoreAll: plusAmount > 3 ? 1 : 0,
        zeroPart: isParticular && plusAmount === 0 ? 1 : 0,
        oncePart: isParticular && plusAmount === 1 ? 1 : 0,
        twicePart: isParticular && plusAmount === 2 ? 1 : 0,
        threeTimesPart: isParticular && plusAmount === 3 ? 1 : 0,
        fourTimesOrMorePart: isParticular && (plusAmount > 3) ? 1 : 0,
      });
    }
  }
  return Array.from(groups.values());
}

