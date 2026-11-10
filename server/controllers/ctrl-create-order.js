import { Op } from 'sequelize';

import {
  Recipient,
  Occasion,
  Senior,
} from '../models/index.js';

import CustomError from '../shared/customError.js';

import {
  ADDRESS_CATEGORY,
  GENDER_FILTER,
} from '../../shared/dist/constants/orders.js';


function buildCategoryLimits(
  amount,
  filters,
  forSchoolDepartment,
) {
  // TODO: Add algorithms for other occasion types.
  let genPart = 0.6;
  const specPart = 0.1;
  let specFactor = 1;

  if (
    filters.addressCategory === ADDRESS_CATEGORY.FOR_SCHOOLS ||
    filters.addressCategory === ADDRESS_CATEGORY.NO_RELEASED ||
    forSchoolDepartment
  ) {
    specFactor = 0;
  }

  if (
    filters.addressCategory ===
    ADDRESS_CATEGORY.ONLY_WITH_ADDRESS
  ) {
    genPart = 1;
    specFactor = 0;
  }

  if (
    filters.addressCategory ===
    ADDRESS_CATEGORY.ONLY_MENT
  ) {
    genPart = 0;
    specFactor = 0;
  }

  let femalePart = 0.5;

  if (filters.gender === GENDER_FILTER.MALE) {
    femalePart = 0;
  }

  if (filters.gender === GENDER_FILTER.FEMALE) {
    femalePart = 1;
  }

  let gen = Math.ceil(amount * genPart);

  if (filters.maxNoAddress) {
    gen = amount - filters.maxNoAddress;
  }

  let spec =
    Math.floor(amount * specPart) *
    specFactor;

  if (
    filters.maxNoAddress &&
    spec > filters.maxNoAddress
  ) {
    spec = filters.maxNoAddress;
  }

  const ment = amount - gen - spec;

  const femaleTotal =
    filters.femaleAmount ??
    Math.ceil(amount * femalePart);

  let femaleLeft = femaleTotal;

  const genFemale = Math.min(
    Math.round(
      (gen * femaleTotal) / amount,
    ),
    femaleLeft,
    gen,
  );

  femaleLeft -= genFemale;

  const mentFemale = Math.min(
    Math.round(
      (ment * femaleTotal) / amount,
    ),
    femaleLeft,
    ment,
  );

  femaleLeft -= mentFemale;

  const specFemale = Math.min(
    femaleLeft,
    spec,
  );

  const genMale = gen - genFemale;
  const mentMale = ment - mentFemale;
  const specMale = spec - specFemale;

  const genOldFemale =
    Math.ceil(genFemale * 0.33);

  const genYoungFemale =
    Math.floor(genFemale * 0.33);

  const genMiddleFemale =
    genFemale -
    genOldFemale -
    genYoungFemale;

  const genYoungMale =
    Math.ceil(genMale * 0.33);

  const genMiddleMale =
    Math.floor(genMale * 0.33);

  const genOldMale =
    genMale -
    genYoungMale -
    genMiddleMale;

  const mentMiddleFemale =
    Math.ceil(mentFemale * 0.33);

  const mentYoungFemale =
    Math.floor(mentFemale * 0.33);

  const mentOldFemale =
    mentFemale -
    mentMiddleFemale -
    mentYoungFemale;

  const mentOldMale =
    Math.ceil(mentMale * 0.33);

  const mentMiddleMale =
    Math.floor(mentMale * 0.33);

  const mentYoungMale =
    mentMale -
    mentOldMale -
    mentMiddleMale;

  const specOldFemale =
    Math.ceil(specFemale * 0.33);

  const specMiddleFemale =
    Math.floor(specFemale * 0.33);

  const specYoungFemale =
    specFemale -
    specOldFemale -
    specMiddleFemale;

  const specYoungMale =
    Math.ceil(specMale * 0.33);

  const specMiddleMale =
    Math.floor(specMale * 0.33);

  const specOldMale =
    specMale -
    specYoungMale -
    specMiddleMale;

  const limits = {
    gen_young_male: genYoungMale,
    gen_middle_male: genMiddleMale,
    gen_old_male: genOldMale,

    gen_young_female: genYoungFemale,
    gen_middle_female: genMiddleFemale,
    gen_old_female: genOldFemale,

    ment_young_male: mentYoungMale,
    ment_middle_male: mentMiddleMale,
    ment_old_male: mentOldMale,

    ment_young_female: mentYoungFemale,
    ment_middle_female: mentMiddleFemale,
    ment_old_female: mentOldFemale,

    spec_young_male: specYoungMale,
    spec_middle_male: specMiddleMale,
    spec_old_male: specOldMale,

    spec_young_female: specYoungFemale,
    spec_middle_female: specMiddleFemale,
    spec_old_female: specOldFemale,
  };

  return Object.fromEntries(
    Object.entries(limits).filter(
      ([, value]) => value !== 0,
    ),
  );
}


function getReplacementCategories(
  mainCategory,
  filters,
) {
  const [
    mainHome,
    mainAge,
    mainGender,
  ] = mainCategory.split('_');

  const ageOrder =
    mainAge === 'young'
      ? ['young', 'middle', 'old']
      : mainAge === 'old'
        ? ['old', 'middle', 'young']
        : ['middle', 'young', 'old'];

  const genderOrder = filters.gender
    ? mainGender === 'male'
      ? ['male']
      : ['female']
    : mainGender === 'male'
      ? ['male', 'female']
      : ['female', 'male'];

  const homeOrder =
    mainHome === 'gen'
      ? filters.addressCategory ===
        ADDRESS_CATEGORY.ONLY_WITH_ADDRESS
        ? ['gen']
        : ['gen', 'ment']
      : mainHome === 'spec'
        ? ['spec', 'ment', 'gen']
        : filters.addressCategory ===
            ADDRESS_CATEGORY.ONLY_MENT
          ? ['ment']
          : ['ment', 'gen'];

  const categories = [];

  for (const home of homeOrder) {
    for (const gender of genderOrder) {
      for (const age of ageOrder) {
        categories.push(
          `${home}_${age}_${gender}`,
        );
      }
    }
  }

  return categories;
}


export function getDefaultDates(
  occasionMonth,
  today = new Date(),
) {
  const currentMonth =
    today.getMonth() + 1;

  const currentDay = today.getDate();

  const periods = [
    [1, 5],
    [6, 10],
    [11, 15],
    [16, 20],
    [21, 25],
    [26, 31],
  ];

  const monthDiff =
    (occasionMonth - currentMonth + 12) %
    12;

  if (monthDiff === 0) {
    return {
      date1: 26,
      date2: 31,
    };
  }

  if (monthDiff === 1) {
    const currentPeriod = periods.find(
      ([from, to]) =>
        currentDay >= from &&
        currentDay <= to,
    );

    const [date1, date2] =
      currentPeriod ?? [1, 5];

    return {
      date1,
      date2,
    };
  }

  return {
    date1: 1,
    date2: 5,
  };
}


export async function createRecipientsListForOrder(
  orderDraft,
  filters,
  restrictedRecipientIds,
  t,
) {
  const occasion = await Occasion.findByPk(
    orderDraft.occasionId,
    {
      transaction: t,
    },
  );

  if (!occasion) {
    throw new CustomError(
      'ERRORS.DATA_NOT_FOUND',
      404,
    );
  }

  const amount = orderDraft.amount;
  const selectedRecipients = [];

  const categoryLimits =
    buildCategoryLimits(
      amount,
      filters,
      orderDraft.forSchoolDepartment,
    );

  const maxOneHome =
    filters.maxFromOneHouse
      ? filters.maxFromOneHouse
      : filters.regions?.length ||
          filters.homes?.length
        ? null
        : Math.ceil(amount * 0.2);

  const maxOneRegion =
    filters.regions?.length
      ? null
      : Math.ceil(amount * 0.3);

  const restrictedHomes = new Set();
  const restrictedRegions = new Set();

  const homeCounts = new Map();
  const regionCounts = new Map();

  let { date1, date2 } =
    getDefaultDates(occasion.month);

  if (filters.date1 || filters.date2) {
    date1 =
      filters.date1 ??
      (
        amount >= 50
          ? 1
          : Math.max(
              filters.date2 - 5,
              1,
            )
      );

    date2 =
      filters.date2 ??
      (
        amount >= 50
          ? 31
          : Math.min(
              filters.date1 + 5,
              31,
            )
      );
  }

  const where = {
    occasionId: orderDraft.occasionId,
    isAbsent: false,
    daySnapshot: {
      [Op.between]: [
        date1,
        date2,
      ],
    },
  };

  if (
    filters.addressCategory ===
      ADDRESS_CATEGORY.FOR_SCHOOLS ||
    orderDraft.forSchoolDepartment
  ) {
    where.acceptableForSchool = true;
  }

  if (filters.onlyWithPicture === true) {
    where['$senior.photoLink$'] = {
      [Op.not]: null,
    };
  }

  if (
    filters.onlyAnniversaries === true
  ) {
    where.specialComment = {
      [Op.iLike]: 'юбилей%',
    };
  }

  if (
    filters.onlyAnniversariesAndOldest ===
    true
  ) {
    where.specialComment = {
      [Op.ne]: '',
    };
  }

  if (
    filters.onlyWithConcents === true
  ) {
    where['$senior.dateOfConcent$'] = {
      [Op.not]: null,
    };
  }

  if (filters.year1 || filters.year2) {
    const year1 =
      filters.year1 ?? 1900;

    const year2 =
      filters.year2 ??
      new Date().getFullYear();

    where.yearSnapshot = {
      [Op.between]: [
        year1,
        year2,
      ],
    };
  }

  const maxPlusAmount = 15;

  for (
    const [
      mainCategory,
      categoryLimit,
    ] of Object.entries(categoryLimits)
  ) {
    for (
      let i = 0;
      i < categoryLimit;
      i++
    ) {
      let recipient;

      const searchCategories =
        getReplacementCategories(
          mainCategory,
          filters,
        );

      for (
        const category of searchCategories
      ) {
        const whereHomeIdSnapshot = {
          ...(restrictedHomes.size && {
            [Op.notIn]: [
              ...restrictedHomes,
            ],
          }),
          ...(filters.homes?.length && {
            [Op.in]: filters.homes,
          }),
        };

        const whereRegionIdSnapshot = {
          ...(restrictedRegions.size && {
            [Op.notIn]: [
              ...restrictedRegions,
            ],
          }),
          ...(filters.regions?.length && {
            [Op.in]: filters.regions,
          }),
        };

        const recipientWhere = {
          ...where,
          category,
          plusAmount: {
            [Op.lt]: maxPlusAmount,
          },
          ...(restrictedRecipientIds.length && {
            id: {
              [Op.notIn]:
                restrictedRecipientIds,
            },
          }),
          homeIdSnapshot:
            whereHomeIdSnapshot,
          regionIdSnapshot:
            whereRegionIdSnapshot,
        };

        recipient =
          await Recipient.findOne({
            where: recipientWhere,
            include: [
              {
                model: Senior,
                as: 'senior',
                attributes: [],
                required: true,
              },
            ],
            attributes: [
              'id',
              'homeIdSnapshot',
              'regionIdSnapshot',
              'seniorId',
            ],
            order: [
              ['plusAmount', 'ASC'],
            ],
            transaction: t,
          });

        if (!recipient) {
          continue;
        }

        await recipient.increment(
          'plusAmount',
          {
            by: 1,
            transaction: t,
          },
        );

        selectedRecipients.push(
          recipient,
        );

        restrictedRecipientIds.push(
          recipient.id,
        );

        const homeId =
          recipient.homeIdSnapshot;

        const regionId =
          recipient.regionIdSnapshot;

        if (
          homeId !== null &&
          maxOneHome !== null
        ) {
          const homeCount =
            (homeCounts.get(homeId) ?? 0) +
            1;

          homeCounts.set(
            homeId,
            homeCount,
          );

          if (homeCount >= maxOneHome) {
            restrictedHomes.add(homeId);
          }
        }

        if (
          regionId !== null &&
          maxOneRegion !== null
        ) {
          const regionCount =
            (regionCounts.get(regionId) ??
              0) + 1;

          regionCounts.set(
            regionId,
            regionCount,
          );

          if (
            regionCount >= maxOneRegion
          ) {
            restrictedRegions.add(
              regionId,
            );
          }
        }

        break;
      }

      if (!recipient) {
        // Restore counters if the full order cannot be assembled.
        if (selectedRecipients.length) {
          await Recipient.decrement(
            'plusAmount',
            {
              by: 1,
              where: {
                id: {
                  [Op.in]:
                    selectedRecipients.map(
                      (recipient) =>
                        recipient.id,
                    ),
                },
              },
              transaction: t,
            },
          );
        }

        return [];
      }
    }
  }

  return selectedRecipients;
}
