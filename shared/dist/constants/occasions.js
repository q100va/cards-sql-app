export const OCCASION_TYPE = Object.freeze({
    BIRTHDAY: 1,
    NEW_YEAR: 2,
    FEBRUARY_23: 3,
    MARCH_8: 4,
    MAY_9: 5,
    EASTER: 6,
});
export const OCCASION_STATUS = Object.freeze({
    OPEN: 1,
    CLOSED: 2,
});
export const OCCASION_TYPES = [
    {
        id: OCCASION_TYPE.BIRTHDAY,
        nameKey: 'OCCASION.BIRTHDAY.NAME',
        dateKey: null,
        ru: 'Дни рождения',
        en: 'Birthdays',
    },
    {
        id: OCCASION_TYPE.NEW_YEAR,
        nameKey: 'OCCASION.NEW_YEAR.NAME',
        dateKey: 'OCCASION.NEW_YEAR.DATE',
        ru: 'Новый год',
        en: 'New Year',
    },
    {
        id: OCCASION_TYPE.FEBRUARY_23,
        nameKey: 'OCCASION.FEBRUARY_23.NAME',
        dateKey: 'OCCASION.FEBRUARY_23.DATE',
        ru: '23 февраля',
        en: 'Defender of the Fatherland Day',
    },
    {
        id: OCCASION_TYPE.MARCH_8,
        nameKey: 'OCCASION.MARCH_8.NAME',
        dateKey: 'OCCASION.MARCH_8.DATE',
        ru: '8 Марта',
        en: "International Women's Day",
    },
    {
        id: OCCASION_TYPE.MAY_9,
        nameKey: 'OCCASION.MAY_9.NAME',
        dateKey: 'OCCASION.MAY_9.DATE',
        ru: 'День Победы',
        en: 'Victory Day',
    },
    {
        id: OCCASION_TYPE.EASTER,
        nameKey: 'OCCASION.EASTER.NAME',
        dateKey: 'OCCASION.EASTER.DATE.',
        ru: 'Пасха',
        en: 'Easter',
    },
];
export const MONTHS = [
    {
        id: 1,
        optionKey: 'OCCASION.MONTH.JANUARY.OPT',
        nameKey: 'OCCASION.MONTH.JANUARY.NAME',
        ru: 'Январь',
        en: 'January',
    },
    {
        id: 2,
        optionKey: 'OCCASION.MONTH.FEBRUARY.OPT',
        nameKey: 'OCCASION.MONTH.FEBRUARY.NAME',
        ru: 'Февраль',
        en: 'February',
    },
    {
        id: 3,
        optionKey: 'OCCASION.MONTH.MARCH.OPT',
        nameKey: 'OCCASION.MONTH.MARCH.NAME',
        ru: 'Март',
        en: 'March',
    },
    {
        id: 4,
        optionKey: 'OCCASION.MONTH.APRIL.OPT',
        nameKey: 'OCCASION.MONTH.APRIL.NAME',
        ru: 'Апрель',
        en: 'April',
    },
    {
        id: 5,
        optionKey: 'OCCASION.MONTH.MAY.OPT',
        nameKey: 'OCCASION.MONTH.MAY.NAME',
        ru: 'Май',
        en: 'May',
    },
    {
        id: 6,
        optionKey: 'OCCASION.MONTH.JUNE.OPT',
        nameKey: 'OCCASION.MONTH.JUNE.NAME',
        ru: 'Июнь',
        en: 'June',
    },
    {
        id: 7,
        optionKey: 'OCCASION.MONTH.JULY.OPT',
        nameKey: 'OCCASION.MONTH.JULY.NAME',
        ru: 'Июль',
        en: 'July',
    },
    {
        id: 8,
        optionKey: 'OCCASION.MONTH.AUGUST.OPT',
        nameKey: 'OCCASION.MONTH.AUGUST.NAME',
        ru: 'Август',
        en: 'August',
    },
    {
        id: 9,
        optionKey: 'OCCASION.MONTH.SEPTEMBER.OPT',
        nameKey: 'OCCASION.MONTH.SEPTEMBER.NAME',
        ru: 'Сентябрь',
        en: 'September',
    },
    {
        id: 10,
        optionKey: 'OCCASION.MONTH.OCTOBER.OPT',
        nameKey: 'OCCASION.MONTH.OCTOBER.NAME',
        ru: 'Октябрь',
        en: 'October',
    },
    {
        id: 11,
        optionKey: 'OCCASION.MONTH.NOVEMBER.OPT',
        nameKey: 'OCCASION.MONTH.NOVEMBER.NAME',
        ru: 'Ноябрь',
        en: 'November',
    },
    {
        id: 12,
        optionKey: 'OCCASION.MONTH.DECEMBER.OPT',
        nameKey: 'OCCASION.MONTH.DECEMBER.NAME',
        ru: 'Декабрь',
        en: 'December',
    },
];
export const STATUSES = [
    {
        id: OCCASION_STATUS.OPEN,
        nameKey: 'OCCASION.STATUS.OPEN',
    },
    {
        id: OCCASION_STATUS.CLOSED,
        nameKey: 'OCCASION.STATUS.CLOSED',
    },
];
export const FIRST_OCCASION_YEAR = 2022;
export const LAST_OCCASION_YEAR = 2040;
export const YEARS = Array.from({ length: LAST_OCCASION_YEAR - FIRST_OCCASION_YEAR + 1 }, (_, index) => FIRST_OCCASION_YEAR + index);
export const OCCASION_TYPES_BY_ID = Object.fromEntries(OCCASION_TYPES.map((item) => [item.id, item]));
export const MONTHS_BY_ID = Object.fromEntries(MONTHS.map((item) => [item.id, item]));
export const STATUSES_BY_ID = Object.fromEntries(STATUSES.map((item) => [item.id, item]));
