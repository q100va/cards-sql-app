import CustomError from "../shared/customError.js";
import { MONTHS, TYPES } from "../../shared/dist/constants/occasions.js";

export function getSelectedDateRanges(selection) {
  switch (selection.frequency) {
    case 'MONTHLY':
      return selection.years.flatMap((year) =>
        selection.months.map((month) => ({
          startDate: new Date(Date.UTC(year, month - 1, 1)),
          endDate: new Date(Date.UTC(year, month, 1)),
        })),
      );

    case 'QUARTERLY':
      return selection.years.flatMap((year) =>
        selection.quarters.map((quarter) => {
          const startMonth = (quarter - 1) * 3;

          return {
            startDate: new Date(Date.UTC(year, startMonth, 1)),
            endDate: new Date(Date.UTC(year, startMonth + 3, 1)),
          };
        }),
      );

    case 'ANNUAL':
      return selection.years.map((year) => ({
        startDate: new Date(Date.UTC(year, 0, 1)),
        endDate: new Date(Date.UTC(year + 1, 0, 1)),
      }));
  }
}

const ALGORITHM = {
  1: (groups) => Array.from(groups.values()).map((group) => ({
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
  2: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    seniorsCount: group.seniorsCount.size,
    institutesCount: group.institutesCount.size,
  })),
  3: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    schoolsCount: group.schoolsCount.size,
    newSchoolsCount: group.newSchoolsCount.size,
  })),
  4: (groups) => Array.from(groups.values()).map((group) => ({
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
  const type = (TYPES.find(t => t.id === occasion.type)).nameKey;
  const monthNameKey = occasion.month ? (MONTHS.find(m => m.id === occasion.month)).nameKey : null;
  return [type, monthNameKey, occasion.year].filter(Boolean).join(" ");
}

//TODO:  home categories??? | institute categories | empty row for report

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
      case 'MONTHLY':
        key = `${year}-${month}`;
        periodData = {
          year,
          month,
        };
        break;

      case 'QUARTERLY':
        key = `${year}-Q${quarter}`;
        periodData = {
          year,
          quarter,
        };
        break;

      case 'ANNUAL':
        key = `${year}`;
        periodData = {
          year,
        };
        break;

      default:
        throw new CustomError('ERRORS.REPORTS.INVALID_REQUEST', 422);
    }

    const existingGroup = groups.get(key);
    const instCreatedAt = new Date(order.institute?.createdAt);
    let instKey;

    if (instCreatedAt) {
      const instYear = instCreatedAt.getUTCFullYear();
      const instMonth = instCreatedAt.getUTCMonth() + 1;
      const instQuarter = Math.ceil(month / 3);

      switch (frequency) {
        case 'MONTHLY':
          instKey = `${instYear}-${instMonth}`;
          break;

        case 'QUARTERLY':
          instKey = `${instYear}-Q${instQuarter}`;
          break;

        case 'ANNUAL':
          instKey = `${instYear}`;
          break;

        default:
          throw new CustomError('ERRORS.REPORTS.INVALID_REQUEST', 422);
      }
    }

    //for type 1
    if (type === 1) {
      let seniors = [];
      let homes = [];
      let regions = [];
      const categories = ['дошкольное ОУ', 'школа', 'профессиональное ОУ', 'ВУЗ',
        'Preschool', 'School', 'College', 'University'];

      for (let recipient of order.orderRecipients) {
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
          if (categories.includes(order.institute.category)) {
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
          key: key,
          periodData: periodData,
          recipientsCount: Number(order.amount),
          volunteersCount: new Set([order.volunteerId]),
          institutesCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
          schoolsCount: (order.instituteId && categories.includes(order.institute.category)) ? new Set([order.instituteId]) : new Set(),
          seniorsCount: new Set(seniors),
          homesCount: new Set(homes),
          regionsCount: new Set(regions),
          occasions,

        });
      }

      console.log('SENIORS', seniors);

    }

    //for type 2
    if (type === 2) {
      let seniors = [];

      for (let recipient of order.orderRecipients) {
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
        if (order.instituteId) {
          existingGroup.institutesCount.add(order.instituteId);
        }
      } else {
        groups.set(key, {
          key: key,
          periodData: periodData,
          ordersCount: 1,
          recipientsCount: Number(order.amount),
          seniorsCount: new Set(seniors),
          volunteersCount: new Set([order.volunteerId]),
          institutesCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
        });
      }
    }

    //for type 3
    if (type === 3) {
      if (existingGroup) {
        existingGroup.ordersCount += 1;
        if (order.source === 7) {
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
          key: key,
          periodData: periodData,
          ordersCount: 1,
          dobroruCount: order.source === 7 ? 1 : 0,
          recipientsCount: Number(order.amount),
          volunteersCount: new Set([order.volunteerId]),
          schoolsCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
          newSchoolsCount: order.instituteId && instKey === key ? new Set([order.instituteId]) : new Set(),
        });
      }
    }
  }

  console.log('seniorsCount', groups.values());

  const groupedOrders = ALGORITHM[type](groups);
  //console.log('groupedOrders', groupedOrders);

  return groupedOrders.sort((a, b) => {
    const yearDifference =
      a.periodData.year - b.periodData.year;

    if (yearDifference !== 0) {
      return yearDifference;
    }

    if (frequency === 'MONTHLY') {
      return (
        (a.periodData.month ?? 0) -
        (b.periodData.month ?? 0)
      );
    }

    if (frequency === 'QUARTERLY') {
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
  const categories = ['дошкольное ОУ', 'школа', 'профессиональное ОУ', 'ВУЗ',
    'Preschool', 'School', 'College', 'University'];

  for (const order of orders) {
    let seniors = [];
    let homes = [];
    let regions = [];

    for (let recipient of order.orderRecipients) {
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
        if (categories.includes(order.institute.category)) {
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
        schoolsCount: (order.instituteId && categories.includes(order.institute.category)) ? new Set([order.instituteId]) : new Set(),
        seniorsCount: new Set(seniors),
        homesCount: new Set(homes),
        regionsCount: new Set(regions),

      });
    }
  }
  return ALGORITHM[4](groups);
}

export function getStatistic(recipients) {
  const groups = new Map();

  for (const recipient of recipients) {

    const isParticular = recipient.category.startsWith('ment') || recipient.category.startsWith('spec');
    const plusAmount = recipient.plusAmount;

    const existingGroup = groups.get(recipient.occasionId);

    if (existingGroup) {
      existingGroup.allRecipients += 1;
      if (isParticular)
        existingGroup.partRecipients += 1;
      if (plusAmount === 0) {
        existingGroup.zeroAll += 1;
        if (isParticular) existingGroup.zeroPart += 1;
      }
      if (plusAmount === 1) {
        existingGroup.onceAll += 1;
        if (isParticular) existingGroup.oncePart += 1;
      }
      if (plusAmount === 2) {
        existingGroup.twiceAll += 1;
        if (isParticular) existingGroup.twicePart += 1;
      }
      if (plusAmount === 3) {
        existingGroup.threeTimesAll += 1;
        if (isParticular) existingGroup.threeTimesPart += 1;
      }
      if (plusAmount > 3) {
        existingGroup.fourTimesOrMoreAll += 1;
        if (isParticular) existingGroup.fourTimesOrMorePart += 1;
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

export const COLUMNS = {

  1: () => [
    { field: 'periodData', header: 'REPORTS.TABLE.PERIOD' },
    {
      field: 'recipientsCount',
      header: 'REPORTS.TABLE.CARDS_COUNT',
    },
    {
      field: 'seniorsCount',
      header: 'REPORTS.TABLE.SENIORS_COUNT',
    },
    {
      field: 'homesCount',
      header: 'REPORTS.TABLE.HOMES_COUNT',
    },
    {
      field: 'regionsCount',
      header: 'REPORTS.TABLE.REGIONS_COUNT',
    },
    {
      field: 'volunteersCount',
      header: 'REPORTS.TABLE.VOLUNTEERS_COUNT',
    },
    { field: 'institutesCount', header: 'REPORTS.TABLE.INSTITUTES_COUNT' },
    { field: 'schoolsCount', header: 'REPORTS.TABLE.SCHOOLS_COUNT' },
  ],

  2: () => [
    { field: 'periodData', header: 'REPORTS.TABLE.PERIOD' },
    { field: 'ordersCount', header: 'REPORTS.TABLE.ORDERS_COUNT' },
    {
      field: 'recipientsCount',
      header: 'REPORTS.TABLE.CARDS_COUNT',
    },
    { field: 'seniorsCount', header: 'REPORTS.TABLE.SENIORS_COUNT' },
    {
      field: 'volunteersCount',
      header: 'REPORTS.TABLE.VOLUNTEERS_COUNT',
    },
    { field: 'institutesCount', header: 'REPORTS.TABLE.INSTITUTES_COUNT' },
  ],

  3: () => [
    { field: 'periodData', header: 'REPORTS.TABLE.PERIOD' },
    { field: 'ordersCount', header: 'REPORTS.TABLE.ORDERS_COUNT' },
    { field: 'dobroruCount', header: 'REPORTS.TABLE.DOBRORU_COUNT' },
    {
      field: 'recipientsCount',
      header: 'REPORTS.TABLE.CARDS_COUNT',
    },
    {
      field: 'volunteersCount',
      header: 'REPORTS.TABLE.VOLUNTEERS_COUNT',
    },
    { field: 'schoolsCount', header: 'REPORTS.TABLE.SCHOOLS_COUNT' },
    {
      field: 'newSchoolsCount',
      header: 'REPORTS.TABLE.NEW_SCHOOLS_COUNT',
    },
  ],

  4: () => [
    { field: 'occasionName', header: 'REPORTS.TABLE.OCCASION' },
    { field: 'ordersCount', header: 'REPORTS.TABLE.ORDERS_COUNT' },
    {
      field: 'recipientsCount',
      header: 'REPORTS.TABLE.CARDS_COUNT',
    },
    {
      field: 'seniorsCount',
      header: 'REPORTS.TABLE.SENIORS_COUNT',
    },
    {
      field: 'homesCount',
      header: 'REPORTS.TABLE.HOMES_COUNT',
    },
    {
      field: 'regionsCount',
      header: 'REPORTS.TABLE.REGIONS_COUNT',
    },
    {
      field: 'volunteersCount',
      header: 'REPORTS.TABLE.VOLUNTEERS_COUNT',
    },
    { field: 'institutesCount', header: 'REPORTS.TABLE.INSTITUTES_COUNT' },
    { field: 'schoolsCount', header: 'REPORTS.TABLE.SCHOOLS_COUNT' },
  ],

  5: () => [
    { field: 'occasionName', header: 'STATISTIC.TABLE.OCCASION' },
    { field: 'allRecipients', header: 'STATISTIC.TABLE.ALL_RECIPIENTS' },
    {
      field: 'partRecipients',
      header: 'STATISTIC.TABLE.PART_RECIPIENTS',
    },
    {
      field: 'zeroAll',
      header: 'STATISTIC.TABLE.ALL_RECIPIENTS',
    },
    {
      field: 'zeroPart',
      header: 'STATISTIC.TABLE.PART_RECIPIENTS',
    },
    {
      field: 'onceAll',
      header: 'STATISTIC.TABLE.ALL_RECIPIENTS',
    },
    {
      field: 'oncePart',
      header: 'STATISTIC.TABLE.PART_RECIPIENTS',
    },
    {
      field: 'twiceAll',
      header: 'STATISTIC.TABLE.ALL_RECIPIENTS',
    },
    {
      field: 'twicePart',
      header: 'STATISTIC.TABLE.PART_RECIPIENTS',
    },
    {
      field: 'threeTimesAll',
      header: 'STATISTIC.TABLE.ALL_RECIPIENTS',
    },
    {
      field: 'threeTimesPart',
      header: 'STATISTIC.TABLE.PART_RECIPIENTS',
    },
    {
      field: 'fourTimesOrMoreAll',
      header: 'STATISTIC.TABLE.ALL_RECIPIENTS',
    },
    {
      field: 'fourTimesOrMorePart',
      header: 'STATISTIC.TABLE.PART_RECIPIENTS',
    },

  ],



}



