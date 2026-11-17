export declare const ORDER_STATUS: {
    readonly PENDING: 1;
    readonly ACCEPTED: 2;
    readonly RETURNED: 3;
    readonly OVERDUE: 4;
};
export declare const ORDER_SOURCE: {
    readonly SUBSCRIPTION: 1;
    readonly WEBSITE: 2;
    readonly VK: 3;
    readonly TELEGRAM: 4;
    readonly INSTAGRAM: 5;
    readonly DOBRORU: 6;
    readonly INFLUENCER: 7;
    readonly OTHER: 8;
};
export declare const ORDER_STATUSES: {
    readonly 1: {
        readonly key: "ORDER.CARD.STATUS.PENDING";
        readonly ru: "ожидает";
        readonly en: "Pending";
    };
    readonly 2: {
        readonly key: "ORDER.CARD.STATUS.ACCEPTED";
        readonly ru: "принята";
        readonly en: "Accepted";
    };
    readonly 3: {
        readonly key: "ORDER.CARD.STATUS.RETURNED";
        readonly ru: "возвращена";
        readonly en: "Returned";
    };
    readonly 4: {
        readonly key: "ORDER.CARD.STATUS.OVERDUE";
        readonly ru: "просрочена";
        readonly en: "Overdue";
    };
};
export declare const ORDER_SOURCES: {
    readonly 1: {
        readonly key: "ORDER.CARD.SOURCE.SUBS";
        readonly ru: "постоянные";
        readonly en: "Subscription";
    };
    readonly 2: {
        readonly key: "ORDER.CARD.SOURCE.SITE";
        readonly ru: "сайт";
        readonly en: "Website";
    };
    readonly 3: {
        readonly key: "ORDER.CARD.SOURCE.VK";
        readonly ru: "вконтакте";
        readonly en: "VK";
    };
    readonly 4: {
        readonly key: "ORDER.CARD.SOURCE.TELEGRAM";
        readonly ru: "телеграм";
        readonly en: "Telegram";
    };
    readonly 5: {
        readonly key: "ORDER.CARD.SOURCE.INSTA";
        readonly ru: "инста";
        readonly en: "Instagram";
    };
    readonly 6: {
        readonly key: "ORDER.CARD.SOURCE.DOBRORU";
        readonly ru: "добро.ру";
        readonly en: "Dobro.ru";
    };
    readonly 7: {
        readonly key: "ORDER.CARD.SOURCE.INFLUENCER";
        readonly ru: "блогер";
        readonly en: "Influencer";
    };
    readonly 8: {
        readonly key: "ORDER.CARD.SOURCE.OTHER";
        readonly ru: "другое";
        readonly en: "Other";
    };
};
export declare const ORDER_SOURCE_OPTIONS: {
    id: number;
    optionKey: "ORDER.CARD.SOURCE.SUBS" | "ORDER.CARD.SOURCE.SITE" | "ORDER.CARD.SOURCE.VK" | "ORDER.CARD.SOURCE.TELEGRAM" | "ORDER.CARD.SOURCE.INSTA" | "ORDER.CARD.SOURCE.DOBRORU" | "ORDER.CARD.SOURCE.INFLUENCER" | "ORDER.CARD.SOURCE.OTHER";
}[];
export declare const ORDER_RECIPIENT_STATUS: {
    readonly PRESENT: 1;
    readonly ABSENT: 2;
    readonly DELETED: 3;
};
export declare const ORDER_RECIPIENT_STATUSES: {
    readonly 1: {
        readonly key: "ORDER.CARD.RECIPIENT_STATUS.PRESENT";
    };
    readonly 2: {
        readonly key: "ORDER.CARD.RECIPIENT_STATUS.ABSENT";
    };
    readonly 3: {
        readonly key: "ORDER.CARD.RECIPIENT_STATUS.DELETED";
    };
};
export declare const ADDRESS_CATEGORY: {
    readonly ANY: 1;
    readonly FOR_SCHOOLS: 2;
    readonly ONLY_WITH_ADDRESS: 3;
    readonly NO_RELEASED: 4;
    readonly ONLY_MENT: 5;
};
export declare const GENDER_FILTER: {
    readonly ANY: 1;
    readonly MALE: 2;
    readonly FEMALE: 3;
    readonly PROPORTION: 4;
};
export declare const ADDRESS_CATEGORIES: readonly [{
    readonly id: 1;
    readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ANY";
}, {
    readonly id: 2;
    readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.FOR_SCHOOLS";
}, {
    readonly id: 3;
    readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_WITH_ADDRESS";
}, {
    readonly id: 4;
    readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.NO_RELEASED";
}, {
    readonly id: 5;
    readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_MENT_CATEGORY";
}];
export declare const GENDER_FILTERS: readonly [{
    readonly id: 1;
    readonly optionKey: "ORDER.CARD.FILTERS.GENDER.ANY";
    readonly disabled: false;
}, {
    readonly id: 2;
    readonly optionKey: "ORDER.CARD.FILTERS.GENDER.MALE";
    readonly disabled: false;
}, {
    readonly id: 3;
    readonly optionKey: "ORDER.CARD.FILTERS.GENDER.FEMALE";
    readonly disabled: false;
}, {
    readonly id: 4;
    readonly optionKey: "ORDER.CARD.FILTERS.GENDER.PROPORTION";
    readonly disabled: false;
}];
export declare const ADDRESS_CATEGORY_OPTIONS: {
    readonly ANY: {
        readonly id: 1;
        readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ANY";
    };
    readonly FOR_SCHOOLS: {
        readonly id: 2;
        readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.FOR_SCHOOLS";
    };
    readonly ONLY_WITH_ADDRESS: {
        readonly id: 3;
        readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_WITH_ADDRESS";
    };
    readonly NO_RELEASED: {
        readonly id: 4;
        readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.NO_RELEASED";
    };
    readonly ONLY_MENT: {
        readonly id: 5;
        readonly optionKey: "ORDER.CARD.FILTERS.ADDRESS_CATEGORY.ONLY_MENT_CATEGORY";
    };
};
