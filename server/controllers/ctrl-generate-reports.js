import CustomError from "../shared/customError.js";

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
    schoolsCount: group.schoolsCount.size,
    newSchoolsCount: group.newSchoolsCount.size,
  })),
  2: (groups) => Array.from(groups.values()).map((group) => ({
    ...group,
    volunteersCount: group.volunteersCount.size,
    institutesCount: group.institutesCount.size,
    seniorsCount: group.seniorsCount.size,
    homesCount: group.homesCount.size,
    regionsCount: group.regionsCount.size

  })),
};

export function groupOrdersByPeriod(
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
    //TODO: группировку по occasion в пределах периода | institute categories | empty row for report
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

    //for type 2
    if (type === 2) {
      let seniors = [];
      let homes = [];
      let regions = [];

      for (let recipient of order.orderRecipients) {
        seniors.push(recipient.seniorId);
        homes.push(recipient.homeId);
        regions.push(recipient.recipient.regionIdSnapshot);
      }

      if (existingGroup) {
        existingGroup.recipientsCount += Number(order.amount);
        existingGroup.volunteersCount.add(order.volunteerId);
        if (order.instituteId) {
          existingGroup.institutesCount.add(order.instituteId);
        }
        existingGroup.seniorsCount.add(...seniors);
        existingGroup.homesCount.add(...homes);
        existingGroup.regionsCount.add(...regions);
      } else {
        groups.set(key, {
          periodData: periodData,
          recipientsCount: Number(order.amount),
          volunteersCount: new Set([order.volunteerId]),
          institutesCount: order.instituteId ? new Set([order.instituteId]) : new Set(),
          seniorsCount: new Set(seniors),
          homesCount: new Set(homes),
          regionsCount: new Set(regions)

        });
      }
    }
  }

  console.log('seniorsCount', groups.values());

  const groupedOrders = ALGORITHM[type](groups);
  console.log('groupedOrders', groupedOrders);

  return Array.from(groupedOrders.values()).sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }

    if (frequency === 'MONTHLY') {
      return (a.month ?? 0) - (b.month ?? 0);
    }

    if (frequency === 'QUARTERLY') {
      return (a.quarter ?? 0) - (b.quarter ?? 0);
    }

    return 0;
  });
}

export const COLUMNS = {
  1: () => [
    { field: 'periodData', header: 'REPORTS.TABLE.PERIOD' },
    { field: 'ordersCount', header: 'REPORTS.TABLE.ORDERS_COUNT' },
    { field: 'dobroruCount', header: 'REPORTS.TABLE.DOBRORU_COUNT' },
    {
      field: 'recipientsCount',
      header: 'REPORTS.TABLE.RECIPIENTS_COUNT',
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

  2: () => [
    { field: 'periodData', header: 'REPORTS.TABLE.PERIOD' },
    {
      field: 'recipientsCount',
      header: 'REPORTS.TABLE.RECIPIENTS_COUNT',
    },
    {
      field: 'volunteersCount',
      header: 'REPORTS.TABLE.VOLUNTEERS_COUNT',
    },
    { field: 'institutesCount', header: 'REPORTS.TABLE.INSTITUTES_COUNT' },
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
  ],

}



