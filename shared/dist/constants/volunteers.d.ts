export declare const INSTITUTE_CATEGORY: {
    readonly SCHOOL: 1;
    readonly KINDERGARTEN: 2;
    readonly COLLEGE: 3;
    readonly UNIVERSITY: 4;
    readonly GOVERNMENT: 5;
    readonly BUSINESS: 6;
    readonly CHURCH: 7;
    readonly CHARITY: 8;
    readonly CHILDREN: 9;
    readonly YOUTH: 10;
    readonly ADULTS: 11;
    readonly OTHER: 12;
};
export type InstituteCategoryId = (typeof INSTITUTE_CATEGORY)[keyof typeof INSTITUTE_CATEGORY];
type InstituteCategoryInfo = {
    key: string;
    ru: string;
    en: string;
};
export declare const INSTITUTE_CATEGORIES: Record<number, InstituteCategoryInfo>;
export declare const INSTITUTE_CATEGORY_OPTIONS: {
    id: InstituteCategoryId;
    optionKey: string;
}[];
export {};
