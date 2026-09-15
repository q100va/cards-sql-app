import { z } from 'zod';
import {
  positiveInt,
  positiveIntParam,
} from './common.schema.js';


export const toponymTypeSchema = z.enum([
  'country',
  'region',
  'district',
  'locality',
]);


const toponymTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(200);

const booleanQuerySchema = z.preprocess(
  (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  },
  z.boolean(),
);

const idsQuerySchema = z.preprocess(
  (value) => {
    if (value == null) return [];

    return Array.isArray(value)
      ? value
      : [value];
  },
  z.array(positiveIntParam),
);


// --------------------------------------------------
// Duplicate check
// --------------------------------------------------

export const checkToponymNameSchema = z
  .object({
    type: toponymTypeSchema,
    name: toponymTextSchema,

    id: positiveIntParam.optional(),

    countryId: positiveIntParam.optional(),
    regionId: positiveIntParam.optional(),
    districtId: positiveIntParam.optional(),
  })
  .strict();


// --------------------------------------------------
// Create
// --------------------------------------------------

const countryCreateSchema = z
  .object({
    type: z.literal('country'),
    name: toponymTextSchema,
  })
  .strict();

const regionCreateSchema = z
  .object({
    type: z.literal('region'),

    name: toponymTextSchema,
    shortName: toponymTextSchema,

    countryId: positiveInt,
  })
  .strict();

const districtCreateSchema = z
  .object({
    type: z.literal('district'),

    name: toponymTextSchema,
    shortName: toponymTextSchema,
    postName: toponymTextSchema,
    shortPostName: toponymTextSchema,

    countryId: positiveInt,
    regionId: positiveInt,
  })
  .strict();

const localityCreateSchema = z
  .object({
    type: z.literal('locality'),

    name: toponymTextSchema,
    shortName: toponymTextSchema,

    countryId: positiveInt,
    regionId: positiveInt,
    districtId: positiveInt,

    isFederalCity: z.boolean(),
    isCapitalOfRegion: z.boolean(),
    isCapitalOfDistrict: z.boolean(),
  })
  .strict();

export const toponymCreateSchema =
  z.discriminatedUnion('type', [
    countryCreateSchema,
    regionCreateSchema,
    districtCreateSchema,
    localityCreateSchema,
  ]);


// --------------------------------------------------
// Update
// --------------------------------------------------

const countryUpdateSchema =
  countryCreateSchema.extend({
    id: positiveInt,
  });

const regionUpdateSchema =
  regionCreateSchema.extend({
    id: positiveInt,
  });

const districtUpdateSchema =
  districtCreateSchema.extend({
    id: positiveInt,
  });

const localityUpdateSchema =
  localityCreateSchema.extend({
    id: positiveInt,
  });

export const toponymUpdateSchema =
  z.discriminatedUnion('type', [
    countryUpdateSchema,
    regionUpdateSchema,
    districtUpdateSchema,
    localityUpdateSchema,
  ]);


// --------------------------------------------------
// Get by id
// --------------------------------------------------

export const findToponymByIdSchema = z
  .object({
    id: positiveIntParam,
    type: toponymTypeSchema,
  })
  .strict();


// --------------------------------------------------
// Short lists for address filters
// --------------------------------------------------

export const getToponymsListSchema = z
  .object({
    ids: idsQuerySchema,

    typeOfToponym: z.enum([
      'countries',
      'regions',
      'districts',
      'localities',
    ]),
  })
  .strict();


// --------------------------------------------------
// Responses
// --------------------------------------------------

export const DefaultAddressParamsSchema = z
  .object({
    localityId: positiveInt.nullable(),
    districtId: positiveInt.nullable(),
    regionId: positiveInt.nullable(),
    countryId: positiveInt.nullable(),
  })
  .strict();

export const toponymSchema = z
  .object({
    id: positiveInt,
    name: z.string(),

    defaultAddressParams:
      DefaultAddressParamsSchema.optional(),

    shortName: z.string().optional(),
    postName: z.string().optional(),
    shortPostName: z.string().optional(),

    isFederalCity: z.boolean().optional(),
    isCapitalOfRegion: z.boolean().optional(),
    isCapitalOfDistrict: z.boolean().optional(),

    countryName: z.string().optional(),
    regionName: z.string().optional(),
    districtName: z.string().optional(),
  })
  .strict();

const toponymNameItemSchema = z
  .object({
    id: positiveInt,
    name: z.string(),

    countryId: positiveInt.optional(),
    regionId: positiveInt.optional(),
    districtId: positiveInt.optional(),
  })
  .strict();

export const toponymNamesListSchema =
  z.array(toponymNameItemSchema);

export const toponymsSchema = z
  .object({
    toponyms: z.array(toponymSchema),
    length: z.number().int().min(0),
  })
  .strict();


// --------------------------------------------------
// Form
// --------------------------------------------------

const formTextSchema = z
  .string()
  .trim()
  .min(1, {
    message: 'FORM_VALIDATION.REQUIRED',
  })
  .max(200, {
    message: 'FORM_VALIDATION.TOPONYM.NAME_MAX',
  });

export const toponymFormSchema = z
  .object({
    name: formTextSchema,
    shortName: formTextSchema,
    postName: formTextSchema,
    shortPostName: formTextSchema,
  })
  .strict();


// --------------------------------------------------
// Table query
// --------------------------------------------------

const toponymSortSchema = z.enum([
  'name',
  'shortName',
  'postName',
  'shortPostName',
  'country',
  'region',
  'district',
]);

const SORT_FIELDS_BY_TYPE: Record<
  z.infer<typeof toponymTypeSchema>,
  readonly string[]
> = {
  country: [
    'name',
  ],

  region: [
    'name',
    'shortName',
    'country',
  ],

  district: [
    'name',
    'shortName',
    'postName',
    'shortPostName',
    'region',
    'country',
  ],

  locality: [
    'name',
    'shortName',
    'district',
    'region',
    'country',
  ],
};

export const toponymQueryDTOSchema = z
  .object({
    type: toponymTypeSchema,

    search: z
      .string()
      .trim()
      .optional()
      .default(''),

    exact: booleanQuerySchema
      .optional()
      .default(false),

    sortBy: toponymSortSchema
      .optional()
      .default('name'),

    sortDir: z
      .enum(['asc', 'desc'])
      .optional()
      .default('asc'),

    page: z
      .coerce
      .number()
      .int()
      .min(0)
      .optional()
      .default(0),

    pageSize: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(20),

    countries: idsQuerySchema,
    regions: idsQuerySchema,
    districts: idsQuerySchema,
    localities: idsQuerySchema,
  })
  .strict()
  .superRefine((query, ctx) => {
    const allowedSortFields =
      SORT_FIELDS_BY_TYPE[query.type];

    if (!allowedSortFields.includes(query.sortBy)) {
      ctx.addIssue({
        code: 'custom',
        path: ['sortBy'],
        message: 'INVALID_SORT_FIELD',
      });
    }
  });


// --------------------------------------------------
// Delete / block
// --------------------------------------------------

export const deleteToponymSchema = z
  .object({
    id: positiveIntParam,
    type: toponymTypeSchema,

    destroy: booleanQuerySchema
      .optional()
      .default(false),
  })
  .strict();


// --------------------------------------------------
// Bulk upload
// --------------------------------------------------

const countryBulkRowSchema = z.object({
  name: toponymTextSchema,
});

const regionBulkRowSchema = z.object({
  country: toponymTextSchema,
  name: toponymTextSchema,
  shortName: toponymTextSchema,
});

const districtBulkRowSchema = z.object({
  region: toponymTextSchema,
  name: toponymTextSchema,
  postName: toponymTextSchema,
  postNameType: toponymTextSchema,
});

const localityBulkRowSchema = z.object({
  region: toponymTextSchema,
  district: toponymTextSchema,
  name: toponymTextSchema,
  type: toponymTextSchema,

  isCapitalOfDistrict: z.boolean(),
  isCapitalOfRegion: z.boolean(),
  isFederalCity: z.boolean(),
});

export const bulkToponymsSchema =
  z.discriminatedUnion('type', [
    z
      .object({
        type: z.literal('country'),
        data: z
          .array(countryBulkRowSchema)
          .min(1),
      })
      .strip(),

    z
      .object({
        type: z.literal('region'),
        data: z
          .array(regionBulkRowSchema)
          .min(1),
      })
      .strip(),

    z
      .object({
        type: z.literal('district'),
        data: z
          .array(districtBulkRowSchema)
          .min(1),
      })
      .strip(),

    z
      .object({
        type: z.literal('locality'),
        data: z
          .array(localityBulkRowSchema)
          .min(1),
      })
      .strip(),
  ]);


// --------------------------------------------------
// Types
// --------------------------------------------------

export type ToponymType =
  z.infer<typeof toponymTypeSchema>;

export type ToponymCreate =
  z.infer<typeof toponymCreateSchema>;

export type ToponymUpdate =
  z.infer<typeof toponymUpdateSchema>;

export type DraftToponym = {
  id?: number;

  type: ToponymType;

  name: string;
  shortName?: string;
  postName?: string;
  shortPostName?: string;

  countryId?: number;
  regionId?: number;
  districtId?: number;

  isFederalCity?: boolean;
  isCapitalOfRegion?: boolean;
  isCapitalOfDistrict?: boolean;
};

export type Toponym =
  z.infer<typeof toponymSchema>;

export type ToponymNamesList =
  z.infer<typeof toponymNamesListSchema>;

export type DefaultAddressParams =
  z.infer<typeof DefaultAddressParamsSchema>;

export type ToponymQueryDTO =
  z.infer<typeof toponymQueryDTOSchema>;

export type BulkToponyms =
  z.infer<typeof bulkToponymsSchema>;
