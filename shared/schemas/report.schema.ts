import { z } from 'zod';
import { positiveInt } from './common.schema.js';

export const reportDTOSchema = z
  .object({
    userId: positiveInt.nullable(),
    type: z.number().int().min(1).max(4),
    frequency: z.string(), //MONTHLY, QUARTERLY, ANNUAL
    months: z.array(z.number().int().min(1).max(12)).nullable(),
    quarters: z.array(z.number().int().min(1).max(4)).nullable(),
    years: z.array(z.number().int().min(2022)),
  })
  .strict();

const periodDataSchema = z.object({
  year: positiveInt,
  quarter: positiveInt.optional(),
  month: positiveInt.optional(),
});

export const reportSchoolCoordinationRowSchema = z.object({
  key: z.string(),
  periodData: periodDataSchema,
  ordersCount: z.number(),
  dobroruCount: z.number(),
  recipientsCount: z.number(),
  volunteersCount: z.number(),
  schoolsCount: z.number(),
  newSchoolsCount: z.number(),
});

export const reportGeneralRowSchema = z.object({
  key: z.string(),
  periodData: periodDataSchema,
  recipientsCount: z.number(),
  volunteersCount: z.number(),
  institutesCount: z.number(),
  seniorsCount: z.number(),
  homesCount: z.number(),
  regionsCount: z.number(),
  occasions: z.array(
    z.object({
      occasionId: positiveInt,
      occasionName: z.string(),
      recipientsCount: z.number(),
      seniorsCount: z.number(),
    }),
  ),
});

export const reportPersonalRowSchema = z.object({
  key: z.string(),
  periodData: periodDataSchema,
  ordersCount: z.number(),
  seniorsCount: z.number(),
  recipientsCount: z.number(),
  volunteersCount: z.number(),
  institutesCount: z.number(),
});

export const reportByOccasionRowSchema = z.object({
  key: positiveInt,
  occasionName: z.string(),
  ordersCount: z.number(),
  seniorsCount: z.number(),
  homesCount: z.number(),
  regionsCount: z.number(),
  recipientsCount: z.number(),
  volunteersCount: z.number(),
  institutesCount: z.number(),
});

export const reportRowSchema = z.union([
  reportSchoolCoordinationRowSchema,
  reportGeneralRowSchema,
  reportPersonalRowSchema,
  reportByOccasionRowSchema,
]);

export const reportSchema = z.object({
  type: z.number().int().min(1).max(4),
  report: z.array(reportRowSchema),
  cols: z.array(
    z.object({
      field: z.string(),
      header: z.string(),
    }),
  ),
});

const statisticRowSchema = z.object({
  key: positiveInt,
  occasionName: z.string(),
  allRecipients: z.number(),
  partRecipients: z.number(),
  zeroAll: z.number(),
  onceAll: z.number(),
  twiceAll: z.number(),
  threeTimesAll: z.number(),
  fourTimesOrMoreAll: z.number(),
  zeroPart: z.number(),
  oncePart: z.number(),
  twicePart: z.number(),
  threeTimesPart: z.number(),
  fourTimesOrMorePart: z.number(),
});

export const statisticSchema = z.object({
  report: z.array(statisticRowSchema),
  cols: z.array(
    z.object({
      field: z.string(),
      header: z.string(),
    }),
  ),
});

export type ReportRow = z.infer<typeof reportRowSchema>;
export type ReportResponse = z.infer<typeof reportSchema>;
export type StatisticResponse = z.infer<typeof statisticSchema>;
export type StatisticRow = z.infer<typeof statisticRowSchema>;

export type ReportGeneralRow = z.infer<typeof reportGeneralRowSchema>;
