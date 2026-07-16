import { Op, literal, fn, col } from 'sequelize';
import { Region, District, Locality, HomeAddress, Home, Recipient, Occasion } from '../models/index.js';
import CustomError from '../shared/customError.js';
import { getDefaultDates } from './ctrl-create-order.js';


function chooseTake(remaining, available, minOneHome, maxOneHome) {
  const upper = Math.min(remaining, available, maxOneHome);

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
  restrictedRecipients,
  recipientIds,
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
      maxOneHome
    );

    if (take === 0) {
      continue;
    }

    const queryWhere = {
      ...whereBase,
      homeIdSnapshot: home.homeIdSnapshot,
      id: { [Op.notIn]: restrictedRecipients },
    };

    const recipients = await Recipient.findAll({
      where: queryWhere,
      transaction: t,
      attributes: ['id', 'category', 'homeIdSnapshot', 'seniorId'],
      order: [['plusAmount', 'ASC']],
      limit: take,
    });

    if (recipients.length < minOneHome) {
      await Recipient.decrement('plusAmount', {
        by: 1,
        where: { id: { [Op.in]: recipientIds.map(r => r.id) } },
        transaction: t,
      });

      return {
        ok: false,
        subtotal,
      };
    }

    const ids = recipients.map(r => r.id);

    await Recipient.increment(
      { plusAmount: 1 },
      {
        where: { id: { [Op.in]: ids } },
        transaction: t,
      }
    );

    recipientIds.push(...recipients);
    restrictedRecipients.push(...ids);
    subtotal += recipients.length;
    console.log('SEARCH', home.homeIdSnapshot, ids)
  }

  return {
    ok: true,
    subtotal,
  };
}

export async function createSpecialRecipientsList(orderDraft, filters, restrictedRecipients, t) {

  const occasion = await Occasion.findOne({ where: { id: orderDraft.occasionId }, transaction: t })
  const amount = orderDraft.amount;
  //const occasionType = orderDraft.occasionType;
  const recipientIds = [];
  const femalePart = filters.gender === 2 ? 0 :
    (filters.gender === 3 ? amount : null);
  /* (
  filters.gender === 4 ? filters.femaleAmount : null
)); */
  const malePart = femalePart !== null ? amount - femalePart : null;
  const minOneHome = filters.minFromOneHouse;
  const maxOneHome = filters.maxFromOneHouse ?? amount;
  const maxNoAddress = filters.maxNoAddress ? (
    filters.maxNoAddress < minOneHome ? 0 :
      filters.maxNoAddress
  ) : (filters.addressCategory === 3 ? 0 : Math.max(amount * 0.4, minOneHome));
  let genHomesAmount = amount - maxNoAddress;

  let { date1, date2 } = getDefaultDates(occasion.month);
  if (filters.date1 || filters.date2) {
    date1 = filters.date1 ?? 1; //(amount >= 50 ? 1 : Math.max(filters.date2 - 5, 1));
    date2 = filters.date2 ?? 31; //(amount >= 50 ? 31 : Math.min(filters.date1 + 5, 31));
  }

  const maxPlusAmount = 7;

  const baseWhere = {
    occasionId: orderDraft.occasionId,
    isAbsent: false,
    daySnapshot: { [Op.between]: [date1 - 1, date2 + 1], },
    plusAmount: { [Op.lt]: maxPlusAmount },
    id: { [Op.notIn]: restrictedRecipients },
  };
  const categoryConditions = [];

  if (femalePart === 0) {
    categoryConditions.push({
      [Op.like]: '%male',
    });
  }
  if (malePart === 0) {
    categoryConditions.push({
      [Op.like]: '%female',
    });
  }
  if (filters.addressCategory === 2 || filters.addressCategory === 4) {
    categoryConditions.push({
      [Op.notLike]: 'spec%',
    });
  }
  if (filters.addressCategory === 3) {
    categoryConditions.push({
      [Op.notLike]: 'spec%',
    });
    categoryConditions.push({
      [Op.notLike]: 'ment%',
    });
  }
  if (filters.addressCategory === 5) {
    categoryConditions.push({
      [Op.like]: 'ment%',
    });
  }

  /*   if (categoryConditions.length) {
      baseWhere.category = {
        [Op.and]: categoryConditions,
      };
    } */

  if (filters.addressCategory === 2) baseWhere.acceptableForSchool = true;
  if (filters.onlyWithPicture === true) baseWhere['$senior.photoLink$'] = { [Op.not]: null };
  if (filters.onlyAnniversaries === true) baseWhere.specialComment = { [Op.like]: 'юбилей%' };
  if (filters.onlyAnniversariesAndOldest === true) baseWhere.specialComment = { [Op.not]: null };
  if (filters.onlyWithConcents === true) baseWhere['$senior.dateOfConcent$'] = { [Op.not]: null };
  if (filters.year1 || filters.year2) {
    const year1 = filters.year1 ?? 1900;
    const year2 = filters.year2 ?? new Date().getFullYear();
    baseWhere.yearSnapshot = { [Op.between]: [year1 - 1, year2 + 1], };
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

  const genWhere = {
    ...baseWhere,
    category: categoryConditions.length
      ? {
        [Op.and]: [
          ...categoryConditions,
          { [Op.like]: 'gen%' },
        ],
      }
      : {
        [Op.like]: 'gen%',
      }
  };

  const noAddressWhere = {
    ...baseWhere,
    category: categoryConditions.length
      ? {
        [Op.and]: [
          ...categoryConditions,
          {
            [Op.or]: [
              { [Op.like]: 'spec%' },
              { [Op.like]: 'ment%' },
            ],
          },
        ],
      } : {
        [Op.or]: [
          { [Op.like]: 'spec%' },
          { [Op.like]: 'ment%' },
        ],
      },
  };

  const getHomeStats = await Recipient.findAll({
    where: genWhere,
    transaction: t,
    attributes: [
      'homeIdSnapshot',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['homeIdSnapshot'],
    raw: true,
  });
  const noAddressHomeStats = await Recipient.findAll({
    where: noAddressWhere,
    transaction: t,
    attributes: [
      'homeIdSnapshot',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['homeIdSnapshot'],
    raw: true,
  });


  const eligibleGenHomes = getHomeStats
    .map(h => ({ count: +h.count, homeIdSnapshot: h.homeIdSnapshot, }))
    .filter(h => h.count >= minOneHome)
    .sort((a, b) => a.count - b.count);

  const eligibleNoAddressHomes = noAddressHomeStats
    .map(h => ({ count: +h.count, homeIdSnapshot: h.homeIdSnapshot }))
    .filter(h => h.count >= minOneHome)
    .sort((a, b) => a.count - b.count);

  console.log('eligibleGenHomes', eligibleGenHomes);
  console.log('eligibleNoAddressHomes', eligibleNoAddressHomes);
  const genSum = eligibleGenHomes.reduce(
    (sum, home) => sum + home.count,
    0
  );
  const noAddressSum = eligibleNoAddressHomes.reduce(
    (sum, home) => sum + home.count,
    0
  );
  const checksum = genSum + noAddressSum;

  if (checksum < amount) return [];

  const noAddressResult = await addRecipientsFromHomes({
    homes: eligibleNoAddressHomes,
    whereBase: noAddressWhere,
    targetAmount: maxNoAddress,
    minOneHome,
    maxOneHome,
    restrictedRecipients,
    recipientIds,
    t,
  });

  // if (!noAddressResult.ok) return [];

  const noAddressRest = maxNoAddress - noAddressResult.subtotal;
  genHomesAmount += noAddressRest;

  const genResult = await addRecipientsFromHomes({
    homes: eligibleGenHomes,
    whereBase: genWhere,
    targetAmount: genHomesAmount,
    minOneHome,
    maxOneHome,
    restrictedRecipients,
    recipientIds,
    t,
  });

  if (!genResult.ok || genHomesAmount - genResult.subtotal > 0) {
    await Recipient.decrement('plusAmount', {
      by: 1,
      where: { id: { [Op.in]: recipientIds.map(r => r.id) } },
      transaction: t,
    });
    return [];
  }
  return recipientIds;
}

