export declare const PARTNER_AFFILIATION: {
    readonly VOLUNTEER_COORDINATOR: 1;
    readonly HOME_REPRESENTATIVE: 2;
    readonly FOUNDATION_STAFF: 3;
};
export type PartnerAffiliationId = (typeof PARTNER_AFFILIATION)[keyof typeof PARTNER_AFFILIATION];
type PartnerAffiliationInfo = {
    key: string;
    ru: string;
    en: string;
};
export declare const PARTNER_AFFILIATIONS: Record<number, PartnerAffiliationInfo>;
export declare const PARTNER_AFFILIATION_OPTIONS: {
    id: PartnerAffiliationId;
    optionKey: string;
}[];
export {};
