export declare const OCCASION_TYPE: Readonly<{
    BIRTHDAY: 1;
    NEW_YEAR: 2;
    FEBRUARY_23: 3;
    MARCH_8: 4;
    MAY_9: 5;
    EASTER: 6;
}>;
export declare const OCCASION_STATUS: Readonly<{
    OPEN: 1;
    CLOSED: 2;
}>;
export declare const OCCASION_TYPES: ({
    id: 1;
    nameKey: string;
    dateKey: null;
    ru: string;
    en: string;
} | {
    id: 2;
    nameKey: string;
    dateKey: string;
    ru: string;
    en: string;
} | {
    id: 3;
    nameKey: string;
    dateKey: string;
    ru: string;
    en: string;
} | {
    id: 4;
    nameKey: string;
    dateKey: string;
    ru: string;
    en: string;
} | {
    id: 5;
    nameKey: string;
    dateKey: string;
    ru: string;
    en: string;
} | {
    id: 6;
    nameKey: string;
    dateKey: string;
    ru: string;
    en: string;
})[];
export declare const MONTHS: {
    id: number;
    optionKey: string;
    nameKey: string;
    ru: string;
    en: string;
}[];
export declare const STATUSES: ({
    id: 1;
    nameKey: string;
} | {
    id: 2;
    nameKey: string;
})[];
export declare const FIRST_OCCASION_YEAR = 2022;
export declare const LAST_OCCASION_YEAR = 2040;
export declare const YEARS: number[];
export declare const OCCASION_TYPES_BY_ID: {
    [k: string]: {
        id: 1;
        nameKey: string;
        dateKey: null;
        ru: string;
        en: string;
    } | {
        id: 2;
        nameKey: string;
        dateKey: string;
        ru: string;
        en: string;
    } | {
        id: 3;
        nameKey: string;
        dateKey: string;
        ru: string;
        en: string;
    } | {
        id: 4;
        nameKey: string;
        dateKey: string;
        ru: string;
        en: string;
    } | {
        id: 5;
        nameKey: string;
        dateKey: string;
        ru: string;
        en: string;
    } | {
        id: 6;
        nameKey: string;
        dateKey: string;
        ru: string;
        en: string;
    };
};
export declare const MONTHS_BY_ID: {
    [k: string]: {
        id: number;
        optionKey: string;
        nameKey: string;
        ru: string;
        en: string;
    };
};
export declare const STATUSES_BY_ID: {
    [k: string]: {
        id: 1;
        nameKey: string;
    } | {
        id: 2;
        nameKey: string;
    };
};
