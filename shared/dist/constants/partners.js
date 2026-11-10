export const PARTNER_AFFILIATION = {
    VOLUNTEER_COORDINATOR: 1,
    HOME_REPRESENTATIVE: 2,
    FOUNDATION_STAFF: 3,
};
export const PARTNER_AFFILIATIONS = {
    [PARTNER_AFFILIATION.VOLUNTEER_COORDINATOR]: {
        key: 'PARTNER.AFF.VOLUNTEER_COORDINATOR',
        ru: 'Координатор',
        en: 'Coordinator',
    },
    [PARTNER_AFFILIATION.HOME_REPRESENTATIVE]: {
        key: 'PARTNER.AFF.HOME_REPRESENTATIVE',
        ru: 'Представитель интерната',
        en: 'Home representative',
    },
    [PARTNER_AFFILIATION.FOUNDATION_STAFF]: {
        key: 'PARTNER.AFF.FOUNDATION_STAFF',
        ru: 'Сотрудник фонда',
        en: 'Foundation staff',
    },
};
export const PARTNER_AFFILIATION_OPTIONS = Object.entries(PARTNER_AFFILIATIONS).map(([id, affiliation]) => ({
    id: Number(id),
    optionKey: affiliation.key,
}));
