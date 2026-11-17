import { COLUMNS, REPORT_TYPE } from '../../../../shared/constants/reports';
import { ReportResponse, StatisticResponse } from '../../../../shared/schemas/report.schema';

// Fixtures for the Reports and Statistic component specs only.
export const generalReport: ReportResponse = {
  type: REPORT_TYPE.GENERAL,
  report: [{
    key: '2026-1', periodData: { year: 2026, month: 1 },
    recipientsCount: 12, volunteersCount: 3, institutesCount: 1, schoolsCount: 1,
    seniorsCount: 4, homesCount: 2, regionsCount: 1,
    occasions: [{ occasionId: 20, occasionName: 'OCCASION.BIRTHDAY.NAME 2026', recipientsCount: 12, seniorsCount: 4 }],
  }],
  cols: COLUMNS[REPORT_TYPE.GENERAL],
};

export const personalReport: ReportResponse = {
  type: REPORT_TYPE.PERSONAL,
  report: [{
    key: '2026-1', periodData: { year: 2026, month: 1 },
    ordersCount: 2, seniorsCount: 4, recipientsCount: 12, volunteersCount: 3, institutesCount: 1,
  }],
  cols: COLUMNS[REPORT_TYPE.PERSONAL],
};

export const occasionReport: ReportResponse = {
  type: REPORT_TYPE.BY_OCCASION,
  report: [{
    key: 20, occasionName: 'OCCASION.BIRTHDAY.NAME 2026', ordersCount: 2, seniorsCount: 4,
    homesCount: 2, regionsCount: 1, recipientsCount: 12, volunteersCount: 3, institutesCount: 1, schoolsCount: 1,
  }],
  cols: COLUMNS[REPORT_TYPE.BY_OCCASION],
};

export const annualPersonalReport: ReportResponse = {
  ...personalReport,
  report: [{ ...personalReport.report[0], key: '2026', periodData: { year: 2026 } }],
};

export const statistics: StatisticResponse = {
  report: [{
    key: 20, occasionName: 'OCCASION.BIRTHDAY.NAME 2026', allRecipients: 12, partRecipients: 4,
    zeroAll: 4, onceAll: 3, twiceAll: 2, threeTimesAll: 2, fourTimesOrMoreAll: 1,
    zeroPart: 1, oncePart: 1, twicePart: 1, threeTimesPart: 1, fourTimesOrMorePart: 0,
  }],
  cols: COLUMNS[REPORT_TYPE.CURRENT_STATISTIC],
};

export const reportingTranslations = {
  REPORTS: {
    FORM: { TYPE: 'Report type', FREQUENCY: 'Frequency', YEARS: 'Years', MONTHS: 'Months', QUARTERS: 'Quarters' },
    TYPES: { GENERAL: 'General report', PERSONAL: 'Personal report', SCHOOL_COORDINATION: 'School coordination', BY_OCCASION: 'Report by occasion' },
    FREQUENCIES: { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annually' },
    MONTHS: { JANUARY: 'January', FEBRUARY: 'February' },
    QUARTERS: { SECOND: '2nd quarter' },
    TABLE: { PERIOD: 'Period', EMPTY_MESSAGE: 'No data' },
  },
  OCCASION: { BIRTHDAY: { NAME: 'Birthdays' } },
  STATISTIC: { EXPORT: { OCCASION: 'Occasion', ALL: 'Total recipients', INCL_PART: 'Special categories' } },
};
