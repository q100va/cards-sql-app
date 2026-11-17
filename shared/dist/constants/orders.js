export const ORDER_STATUS = {
    PENDING: 1,
    ACCEPTED: 2,
    RETURNED: 3,
    OVERDUE: 4,
};
export const ORDER_SOURCE = {
    SUBSCRIPTION: 1,
    WEBSITE: 2,
    VK: 3,
    TELEGRAM: 4,
    INSTAGRAM: 5,
    DOBRORU: 6,
    INFLUENCER: 7,
    OTHER: 8,
};
export const ORDER_STATUSES = {
    [ORDER_STATUS.PENDING]: {
        key: 'ORDER.CARD.STATUS.PENDING',
        ru: 'ожидает',
        en: 'Pending',
    },
    [ORDER_STATUS.ACCEPTED]: {
        key: 'ORDER.CARD.STATUS.ACCEPTED',
        ru: 'принята',
        en: 'Accepted',
    },
    [ORDER_STATUS.RETURNED]: {
        key: 'ORDER.CARD.STATUS.RETURNED',
        ru: 'возвращена',
        en: 'Returned',
    },
    [ORDER_STATUS.OVERDUE]: {
        key: 'ORDER.CARD.STATUS.OVERDUE',
        ru: 'просрочена',
        en: 'Overdue',
    },
};
export const ORDER_SOURCES = {
    [ORDER_SOURCE.SUBSCRIPTION]: {
        key: 'ORDER.CARD.SOURCE.SUBS',
        ru: 'постоянные',
        en: 'Subscription',
    },
    [ORDER_SOURCE.WEBSITE]: {
        key: 'ORDER.CARD.SOURCE.SITE',
        ru: 'сайт',
        en: 'Website',
    },
    [ORDER_SOURCE.VK]: {
        key: 'ORDER.CARD.SOURCE.VK',
        ru: 'вконтакте',
        en: 'VK',
    },
    [ORDER_SOURCE.TELEGRAM]: {
        key: 'ORDER.CARD.SOURCE.TELEGRAM',
        ru: 'телеграм',
        en: 'Telegram',
    },
    [ORDER_SOURCE.INSTAGRAM]: {
        key: 'ORDER.CARD.SOURCE.INSTA',
        ru: 'инста',
        en: 'Instagram',
    },
    [ORDER_SOURCE.DOBRORU]: {
        key: 'ORDER.CARD.SOURCE.DOBRORU',
        ru: 'добро.ру',
        en: 'Dobro.ru',
    },
    [ORDER_SOURCE.INFLUENCER]: {
        key: 'ORDER.CARD.SOURCE.INFLUENCER',
        ru: 'блогер',
        en: 'Influencer',
    },
    [ORDER_SOURCE.OTHER]: {
        key: 'ORDER.CARD.SOURCE.OTHER',
        ru: 'другое',
        en: 'Other',
    },
};
export const ORDER_SOURCE_OPTIONS = Object.entries(ORDER_SOURCES).map(([id, source]) => ({
    id: Number(id),
    optionKey: source.key,
}));
export const ORDER_RECIPIENT_STATUS = {
    PRESENT: 1,
    ABSENT: 2,
    DELETED: 3,
};
export const ORDER_RECIPIENT_STATUSES = {
    [ORDER_RECIPIENT_STATUS.PRESENT]: {
        key: 'ORDER.CARD.RECIPIENT_STATUS.PRESENT',
    },
    [ORDER_RECIPIENT_STATUS.ABSENT]: {
        key: 'ORDER.CARD.RECIPIENT_STATUS.ABSENT',
    },
    [ORDER_RECIPIENT_STATUS.DELETED]: {
        key: 'ORDER.CARD.RECIPIENT_STATUS.DELETED',
    },
};
export const ADDRESS_CATEGORY = {
    ANY: 1,
    FOR_SCHOOLS: 2,
    ONLY_WITH_ADDRESS: 3,
    NO_RELEASED: 4,
    ONLY_MENT: 5,
};
export const GENDER_FILTER = {
    ANY: 1,
    MALE: 2,
    FEMALE: 3,
    PROPORTION: 4,
};
export const ADDRESS_CATEGORIES = [
    {
        id: ADDRESS_CATEGORY.ANY,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ANY',
    },
    {
        id: ADDRESS_CATEGORY.FOR_SCHOOLS,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.FOR_SCHOOLS',
    },
    {
        id: ADDRESS_CATEGORY.ONLY_WITH_ADDRESS,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_WITH_ADDRESS',
    },
    {
        id: ADDRESS_CATEGORY.NO_RELEASED,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.NO_RELEASED',
    },
    {
        id: ADDRESS_CATEGORY.ONLY_MENT,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_MENT_CATEGORY',
    },
];
export const GENDER_FILTERS = [
    {
        id: GENDER_FILTER.ANY,
        optionKey: 'ORDER.CARD.FILTERS.GENDER.ANY',
        disabled: false,
    },
    {
        id: GENDER_FILTER.MALE,
        optionKey: 'ORDER.CARD.FILTERS.GENDER.MALE',
        disabled: false,
    },
    {
        id: GENDER_FILTER.FEMALE,
        optionKey: 'ORDER.CARD.FILTERS.GENDER.FEMALE',
        disabled: false,
    },
    {
        id: GENDER_FILTER.PROPORTION,
        optionKey: 'ORDER.CARD.FILTERS.GENDER.PROPORTION',
        disabled: false,
    },
];
export const ADDRESS_CATEGORY_OPTIONS = {
    ANY: {
        id: ADDRESS_CATEGORY.ANY,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ANY',
    },
    FOR_SCHOOLS: {
        id: ADDRESS_CATEGORY.FOR_SCHOOLS,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.FOR_SCHOOLS',
    },
    ONLY_WITH_ADDRESS: {
        id: ADDRESS_CATEGORY.ONLY_WITH_ADDRESS,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_WITH_ADDRESS',
    },
    NO_RELEASED: {
        id: ADDRESS_CATEGORY.NO_RELEASED,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.NO_RELEASED',
    },
    ONLY_MENT: {
        id: ADDRESS_CATEGORY.ONLY_MENT,
        optionKey: 'ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_MENT_CATEGORY',
    },
};
