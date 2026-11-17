export const REPORT_TYPE = {
  GENERAL: 1,
  PERSONAL: 2,
  SCHOOL_COORDINATION: 3,
  BY_OCCASION: 4,
  CURRENT_STATISTIC: 5,
} as const;

export const REPORT_TYPES = {
  [REPORT_TYPE.GENERAL]: {
    key: 'REPORTS.TYPES.GENERAL',
  },

  [REPORT_TYPE.PERSONAL]: {
    key: 'REPORTS.TYPES.PERSONAL',
  },

  [REPORT_TYPE.SCHOOL_COORDINATION]: {
    key: 'REPORTS.TYPES.SCHOOL_COORDINATION',
  },

  [REPORT_TYPE.BY_OCCASION]: {
    key: 'REPORTS.TYPES.BY_OCCASION',
  },

  [REPORT_TYPE.CURRENT_STATISTIC]: {
    key: 'REPORTS.TYPES.CURRENT_STATISTIC',
  },
} as const;

export const REPORT_TYPE_OPTIONS = Object.entries(REPORT_TYPES).map(
  ([id, report]) => ({
    id: Number(id),
    optionKey: report.key,
  }),
);

export const REPORT_FREQUENCY = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUAL: 'ANNUAL',
} as const;

export const COLUMNS = {
  [REPORT_TYPE.GENERAL]: [
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

  [REPORT_TYPE.PERSONAL]: [
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

  [REPORT_TYPE.SCHOOL_COORDINATION]: [
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

  [REPORT_TYPE.BY_OCCASION]: [
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

  [REPORT_TYPE.CURRENT_STATISTIC]: [
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
};
