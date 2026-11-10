import { Op, fn, col } from 'sequelize';

import {
  Recipient,
  Occasion,
  Senior,
} from '../models/index.js';

import CustomError from '../shared/customError.js';
import { getDefaultDates } from './ctrl-create-order.js';

import {
  ADDRESS_CATEGORY,
  GENDER_FILTER,
} from '../../shared/dist/constants/orders.js';


function chooseTake(
  remaining,
  available,
  minOneHome,
  maxOneHome,
) {
  const upper = Math.min(
    remaining,
    available,
    maxOneHome,
  );

  // Keep the remaining amount valid for another home.
  for (let take = upper; take >= minOneHome; take--) {
    const rest = remaining - take;

    if (rest === 0 || rest >= minOneHome) {
      return take;
    }
  }

  return 0;
}


async function addRecipientsFromHomes({
  homes,
  whereBase,
  targetAmount,
  minOneHome,
  maxOneHome,
  restrictedRecipientIds,
  selectedRecipients,
  t,
}) {
  let subtotal = 0;

  for (const home of homes) {
    const remaining = targetAmount - subtotal;

    if (remaining <= 0) break;

    const take = chooseTake(
      remaining,
      home.count,
      minOneHome,
      maxOneHome,
    );

    if (take === 0) continue;

    const recipients = await Recipient.findAll({
      where: {
        ...whereBase,
        homeIdSnapshot: home.homeIdSnapshot,
        id: {
          [Op.notIn]: restrictedRecipientIds,
        },
      },
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
        'category',
        'homeIdSnapshot',
        'seniorId',
      ],
      order: [['plusAmount', 'ASC']],
      limit: take,
      transaction: t,
    });

    if (recipients.length < minOneHome) {
      continue;
    }

    const recipientIds = recipients.map(
      (recipient) => recipient.id,
    );

    await Recipient.increment(
      {
        plusAmount: 1,
      },
      {
        where: {
          id: {
            [Op.in]: recipientIds,
          },
        },
        transaction: t,
      },
    );

    selectedRecipients.push(...recipients);
    restrictedRecipientIds.push(...recipientIds);

    subtotal += recipients.length;
  }

  return { subtotal };
}


export async function createSpecialRecipientsListForOrder(
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

  const minOneHome = filters.minFromOneHouse;
  const maxOneHome =
    filters.maxFromOneHouse ?? amount;

  let maxNoAddress;

  if (filters.maxNoAddress) {
    maxNoAddress =
      filters.maxNoAddress < minOneHome
        ? 0
        : filters.maxNoAddress;
  } else if (
    filters.addressCategory ===
    ADDRESS_CATEGORY.ONLY_WITH_ADDRESS
  ) {
    maxNoAddress = 0;
  } else if (
    filters.addressCategory ===
    ADDRESS_CATEGORY.ONLY_MENT
  ) {
    maxNoAddress = amount;
  } else {
    maxNoAddress = Math.max(
      Math.floor(amount * 0.4),
      minOneHome,
    );
  }

  let genHomesAmount = amount - maxNoAddress;

  let { date1, date2 } = getDefaultDates(
    occasion.month,
  );

  if (filters.date1 || filters.date2) {
    date1 =
      filters.date1 ??
      (
        amount >= 50
          ? 1
          : Math.max(filters.date2 - 5, 1)
      );

    date2 =
      filters.date2 ??
      (
        amount >= 50
          ? 31
          : Math.min(filters.date1 + 5, 31)
      );
  }

  const maxPlusAmount = 7;

  const baseWhere = {
    occasionId: orderDraft.occasionId,
    isAbsent: false,
    daySnapshot: {
      [Op.between]: [date1, date2],
    },
    plusAmount: {
      [Op.lt]: maxPlusAmount,
    },
    id: {
      [Op.notIn]: restrictedRecipientIds,
    },
  };

  const categoryConditions = [];

  if (filters.gender === GENDER_FILTER.MALE) {
    categoryConditions.push({
      [Op.like]: '%male',
    });
  }

  if (filters.gender === GENDER_FILTER.FEMALE) {
    categoryConditions.push({
      [Op.like]: '%female',
    });
  }

  if (
    filters.addressCategory ===
      ADDRESS_CATEGORY.FOR_SCHOOLS ||
    filters.addressCategory ===
      ADDRESS_CATEGORY.NO_RELEASED ||
    orderDraft.forSchoolDepartment
  ) {
    categoryConditions.push({
      [Op.notLike]: 'spec%',
    });
  }

  if (
    filters.addressCategory ===
    ADDRESS_CATEGORY.ONLY_WITH_ADDRESS
  ) {
    categoryConditions.push(
      {
        [Op.notLike]: 'spec%',
      },
      {
        [Op.notLike]: 'ment%',
      },
    );
  }

  if (
    filters.addressCategory ===
    ADDRESS_CATEGORY.ONLY_MENT
  ) {
    categoryConditions.push({
      [Op.like]: 'ment%',
    });
  }

  if (
    filters.addressCategory ===
      ADDRESS_CATEGORY.FOR_SCHOOLS ||
    orderDraft.forSchoolDepartment
  ) {
    baseWhere.acceptableForSchool = true;
  }

  if (filters.onlyWithPicture === true) {
    baseWhere['$senior.photoLink$'] = {
      [Op.not]: null,
    };
  }

  if (filters.onlyAnniversaries === true) {
    baseWhere.specialComment = {
      [Op.iLike]: 'юбилей%',
    };
  }

  if (filters.onlyAnniversariesAndOldest === true) {
    baseWhere.specialComment = {
      [Op.ne]: '',
    };
  }

  if (filters.onlyWithConcents === true) {
    baseWhere['$senior.dateOfConcent$'] = {
      [Op.not]: null,
    };
  }

  if (filters.year1 || filters.year2) {
    const year1 = filters.year1 ?? 1900;
    const year2 =
      filters.year2 ??
      new Date().getFullYear();

    baseWhere.yearSnapshot = {
      [Op.between]: [year1, year2],
    };
  }

  if (filters.regions?.length) {
    baseWhere.regionIdSnapshot = {
      [Op.in]: filters.regions,
    };
  }

  if (filters.homes?.length) {
    baseWhere.homeIdSnapshot = {
      [Op.in]: filters.homes,
    };
  }

  const genCategoryCondition = {
    [Op.like]: 'gen%',
  };

  const noAddressCategoryCondition = {
    [Op.or]: [
      {
        [Op.like]: 'spec%',
      },
      {
        [Op.like]: 'ment%',
      },
    ],
  };

  const genWhere = {
    ...baseWhere,
    category: categoryConditions.length
      ? {
          [Op.and]: [
            ...categoryConditions,
            genCategoryCondition,
          ],
        }
      : genCategoryCondition,
  };

  const noAddressWhere = {
    ...baseWhere,
    category: categoryConditions.length
      ? {
          [Op.and]: [
            ...categoryConditions,
            noAddressCategoryCondition,
          ],
        }
      : noAddressCategoryCondition,
  };

  const seniorInclude = [
    {
      model: Senior,
      as: 'senior',
      attributes: [],
      required: true,
    },
  ];

  const genHomeStats = await Recipient.findAll({
    where: genWhere,
    include: seniorInclude,
    attributes: [
      'homeIdSnapshot',
      [
        fn(
          'COUNT',
          col('recipient.id'),
        ),
        'count',
      ],
    ],
    group: ['homeIdSnapshot'],
    raw: true,
    transaction: t,
  });

  const noAddressHomeStats =
    await Recipient.findAll({
      where: noAddressWhere,
      include: seniorInclude,
      attributes: [
        'homeIdSnapshot',
        [
          fn(
            'COUNT',
            col('recipient.id'),
          ),
          'count',
        ],
      ],
      group: ['homeIdSnapshot'],
      raw: true,
      transaction: t,
    });

  const eligibleGenHomes = genHomeStats
    .map((home) => ({
      count: Number(home.count),
      homeIdSnapshot: home.homeIdSnapshot,
    }))
    .filter(
      (home) => home.count >= minOneHome,
    )
    .sort(
      (homeA, homeB) =>
        homeA.count - homeB.count,
    );

  const eligibleNoAddressHomes =
    noAddressHomeStats
      .map((home) => ({
        count: Number(home.count),
        homeIdSnapshot:
          home.homeIdSnapshot,
      }))
      .filter(
        (home) => home.count >= minOneHome,
      )
      .sort(
        (homeA, homeB) =>
          homeA.count - homeB.count,
      );

  const genSum = eligibleGenHomes.reduce(
    (sum, home) => sum + home.count,
    0,
  );

  const noAddressSum =
    eligibleNoAddressHomes.reduce(
      (sum, home) => sum + home.count,
      0,
    );

  if (genSum + noAddressSum < amount) {
    return [];
  }

  // Fill no-address recipients first; any shortfall may be replaced with addressed recipients.
  const noAddressResult =
    await addRecipientsFromHomes({
      homes: eligibleNoAddressHomes,
      whereBase: noAddressWhere,
      targetAmount: maxNoAddress,
      minOneHome,
      maxOneHome,
      restrictedRecipientIds,
      selectedRecipients,
      t,
    });

  const noAddressRest =
    maxNoAddress -
    noAddressResult.subtotal;

  genHomesAmount += noAddressRest;

  const genResult =
    await addRecipientsFromHomes({
      homes: eligibleGenHomes,
      whereBase: genWhere,
      targetAmount: genHomesAmount,
      minOneHome,
      maxOneHome,
      restrictedRecipientIds,
      selectedRecipients,
      t,
    });

  if (genResult.subtotal < genHomesAmount) {
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

  return selectedRecipients;
}
