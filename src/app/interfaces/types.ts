export type GeographyLevels = 'country' | 'region' | 'district' | 'locality';

export type Ways = {
  [K in GeographyLevels]: {
    locality?: string | null;
    district: string | null;
    region: string | null;
    country: string | null;
  };
};
