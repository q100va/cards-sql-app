import { z } from 'zod';

const toponymTypeSchema = z.enum(['country', 'region', 'district', 'locality']);

export const checkToponymNameSchema = z
  .object({
    type: toponymTypeSchema,
    name: z.string().trim().min(1).max(200),
    id: z.coerce.number().int().optional(),
    countryId: z.coerce.number().int().optional(),
    regionId: z.coerce.number().int().optional(),
    districtId: z.coerce.number().int().optional(),
  })
  .strict();

export const saveToponymSchema = z
  .object({
    id: z.coerce.number().int().optional(),
    type: toponymTypeSchema,
    name: z.string().trim().min(1).max(200),
    shortName: z.string().trim().optional(),
    postName: z.string().trim().optional(),
    shortPostName: z.string().trim().optional(),
    isFederalCity: z.boolean().optional(),
    isCapitalOfRegion: z.boolean().optional(),
    isCapitalOfDistrict: z.boolean().optional(),
    countryId: z.coerce.number().int().optional(),
    regionId: z.coerce.number().int().optional(),
    districtId: z.coerce.number().int().optional(),
  })
  .strict();

export const DefaultAddressParamsSchema = z
  .object({
    localityId: z.number().int().nullable(), // number | null
    districtId: z.number().int().nullable(),
    regionId: z.number().int().nullable(),
    countryId: z.number().int().nullable(),
  })
  .strict();

export const toponymSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),

    defaultAddressParams: DefaultAddressParamsSchema.optional(),

    shortName: z.string().optional(),
    postName: z.string().optional(),
    shortPostName: z.string().optional(),

    isFederalCity: z.boolean().optional(),
    isCapitalOfRegion: z.boolean().optional(),
    isCapitalOfDistrict: z.boolean().optional(),

    countryName: z.string().optional(), // string | undefined
    regionName: z.string().optional(),
    districtName: z.string().optional(),
  })
  .strict();

export const findToponymByIdSchema = z
  .object({
    id: z.coerce.number().int(),
    type: toponymTypeSchema,
  })
  .strict();

const IdsAsArray = z.preprocess((v) => {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v]; // '1' -> ['1']
}, z.array(z.coerce.number().int()));

export const getToponymsListSchema = z
  .object({
    ids: IdsAsArray,
    typeOfToponym: z.enum(['countries', 'regions', 'districts', 'localities']),
  })
  .strict();

export const toponymNamesListSchema = z.array(
  z
    .object({
      id: z.coerce.number().int(),
      name: z.string(),
      countryId: z.coerce.number().int().optional(),
      regionId: z.coerce.number().int().optional(),
      districtId: z.coerce.number().int().optional(),
    })
    .strict()
);

export const toponymsSchema = z
  .object({
    toponyms: z.array(toponymSchema),
    length: z.coerce.number().int().min(0),
  })
  .strict();

const ArrNum = z.preprocess(
  (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
  z.array(z.coerce.number().int())
);

const BoolFromQuery = z.preprocess((v) => {
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'off', ''].includes(s)) return false;
    return false; // или бросай ошибку, если хочешь строже
  }
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'boolean') return v;
  return false;
}, z.boolean());

export const getToponymsSchema = z
  .object({
    type: toponymTypeSchema,
    search: z.string().trim().optional().default(''), // was: searchValue
    exact: BoolFromQuery.optional().default(false), // was: exactMatch
    sortBy: z
      .enum(['name', 'country', 'region', 'district', 'postName'])
      .optional()
      .default('name'),
    sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(200).optional().default(20),
    countries: ArrNum.optional().default([]), // filter by id(s)
    regions: ArrNum.optional().default([]),
    districts: ArrNum.optional().default([]),
    localities: ArrNum.optional().default([]),
  })
  .strip();

export const deleteToponymSchema = z
  .object({
    id: z.coerce.number().int(),
    type: toponymTypeSchema,
    destroy: BoolFromQuery.optional().default(false),
  })
  .strict();

const CountryInput = z.object({
  name: z.string().trim().min(1),
});

const RegionInput = z.object({
  country: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortName: z.string().trim().min(1),
});

const DistrictInput = z.object({
  region: z.string().trim().min(1),
  name: z.string().trim().min(1),
  postName: z.string().trim().min(1),
  postNameType: z.string().trim().min(1),
});

const LocalityInput = z.object({
  region: z.string().trim().min(1),
  district: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().min(1),
  isCapitalOfDistrict: z.boolean(),
  isCapitalOfRegion: z.boolean(),
  isFederalCity: z.boolean(),
});

export const bulkToponymsSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('country'),  data: z.array(CountryInput).min(1) }).strip(),
  z.object({ type: z.literal('region'),   data: z.array(RegionInput).min(1) }).strip(),
  z.object({ type: z.literal('district'), data: z.array(DistrictInput).min(1) }).strip(),
  z.object({ type: z.literal('locality'), data: z.array(LocalityInput).min(1) }).strip(),
]);

export type SaveToponym = z.infer<typeof saveToponymSchema>;
export type ToponymNamesList = z.infer<typeof toponymNamesListSchema>;
export type ToponymType = z.infer<typeof toponymTypeSchema>;
export type Toponym = z.infer<typeof toponymSchema>;
export type DefaultAddressParams = z.infer<typeof DefaultAddressParamsSchema>;
