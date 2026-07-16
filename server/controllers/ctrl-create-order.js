import { Op, literal } from 'sequelize';
import { Region, District, Locality, HomeAddress, Home, Recipient, Occasion } from '../models/index.js';

function getProportion(occasionType, amount, filters) {
  //TODO: for other occasions
  let genPart = 0.6;
  let mentPart = 0.3;
  let specPart = 0.1;
  let specFactor = 1;

  if (filters.addressCategory === 2 || filters.addressCategory === 4) {
    genPart = 0.6; mentPart = 0.4; specFactor = 0;
  }

  if (filters.addressCategory === 3) {
    genPart = 1; mentPart = 0; specFactor = 0;
  }

  if (filters.addressCategory === 5) {
    genPart = 0; mentPart = 1; specFactor = 0;
  }

  if (filters.maxNoAddress) {
    genPart = (amount - filters.maxNoAddress) / filters.maxNoAddress;
    mentPart = 1 - genPart - specPart * specFactor;
  }


  // let malePart = 0.5;
  let femalePart = 0.5;

  if (filters.gender === 2) {
    //   malePart = 1;
    femalePart = 0;
  }

  if (filters.gender === 3) {
    //  malePart = 0;
    femalePart = 1;
  }

  /*   if (filters.gender === 4) {
      malePart = filters.maleAmount / amount;
      femalePart = filters.femaleAmount / amount;
    } */

  const gen = Math.ceil(amount * genPart);
  const spec = Math.floor(amount * specPart) * specFactor;
  const ment = (amount - gen - spec);

  const femaleTotal = filters.femaleAmount ?? Math.ceil(gen * femalePart);
  // const maleTotal = filters.maleAmount ?? gen - femaleTotal;

  let femaleLeft = femaleTotal;

  const gen_female = Math.min(
    Math.round(gen * femaleTotal / amount),
    femaleLeft,
    gen
  );
  femaleLeft -= gen_female;

  const ment_female = Math.min(
    Math.round(ment * femaleTotal / amount),
    femaleLeft,
    ment
  );
  femaleLeft -= ment_female;

  const spec_female = Math.min(
    femaleLeft,
    spec
  );

  const gen_male = gen - gen_female;
  const ment_male = ment - ment_female;
  const spec_male = spec - spec_female;

  /*   const gen_female = Math.ceil(gen * femalePart);
    const gen_male = gen - gen_female;

    const ment_male = Math.ceil(ment * malePart);
    const ment_female = ment - ment_male;

    const spec_male = Math.ceil(spec * malePart);
    const spec_female = spec - spec_male; */

  const gen_old_female = Math.ceil(gen_female * 0.33);
  const gen_young_female = Math.floor(gen_female * 0.33);
  const gen_middle_female = gen_female - gen_old_female - gen_young_female;

  const gen_young_male = Math.ceil(gen_male * 0.33);
  const gen_middle_male = Math.floor(gen_male * 0.33);
  const gen_old_male = gen_male - gen_young_male - gen_middle_male;

  const ment_middle_female = Math.ceil(ment_female * 0.33);
  const ment_young_female = Math.floor(ment_female * 0.33);
  const ment_old_female =
    ment_female - ment_middle_female - ment_young_female;

  const ment_old_male = Math.ceil(ment_male * 0.33);
  const ment_middle_male = Math.floor(ment_male * 0.33);
  const ment_young_male =
    ment_male - ment_old_male - ment_middle_male;

  const spec_old_female = Math.ceil(spec_female * 0.33);
  const spec_middle_female = Math.floor(spec_female * 0.33);
  const spec_young_female =
    spec_female - spec_old_female - spec_middle_female;

  const spec_young_male = Math.ceil(spec_male * 0.33);
  const spec_middle_male = Math.floor(spec_male * 0.33);
  const spec_old_male =
    spec_male - spec_young_male - spec_middle_male;

  const limits = {
    gen_young_male,
    gen_middle_male,
    gen_old_male,

    gen_young_female,
    gen_middle_female,
    gen_old_female,

    ment_young_male,
    ment_middle_male,
    ment_old_male,

    ment_young_female,
    ment_middle_female,
    ment_old_female,

    spec_young_male,
    spec_middle_male,
    spec_old_male,

    spec_young_female,
    spec_middle_female,
    spec_old_female,
  };

  const result = Object.fromEntries(
    Object.entries(limits).filter(([, value]) => value !== 0)
  );
  console.log('AAA getProportion', result)
  return result;
}

function getReplacementCategories(mainCategory, filters) {
  const [mainHome, mainAge, mainGender] = mainCategory.split('_');

  const ageOrder =
    mainAge === 'young'
      ? ['young', 'middle', 'old']
      : mainAge === 'old'
        ? ['old', 'middle', 'young']
        : ['middle', 'young', 'old'];

  const genderOrder =
    filters.gender
      ? (mainGender === 'male'
        ? ['male']
        : ['female'])
      : (mainGender === 'male'
        ? ['male', 'female']
        : ['female', 'male']);

  const homeOrder =
    mainHome === 'gen'
      ? (filters.addressCategory === 3 ?
        ['gen']
        : ['gen', 'ment'])
      : (mainHome === 'spec' ?
        ['spec', 'ment', 'gen']
        : (filters.addressCategory === 5
          ? ['ment'] : ['ment', 'gen']));

  const result = [];

  for (const home of homeOrder) {
    for (const gender of genderOrder) {
      for (const age of ageOrder) {
        result.push(`${home}_${age}_${gender}`);
      }
    }
  }

  return result;
}

export function getDefaultDates(occasionMonth, today = new Date()) {
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const periods = [
    [1, 5],
    [6, 10],
    [11, 15],
    [16, 20],
    [21, 25],
    [26, 31],
  ];
  const monthDiff = (occasionMonth - currentMonth + 12) % 12;
  if (monthDiff === 0) {
    return { date1: 26, date2: 31 };
  }
  if (monthDiff === 1) {
    const currentPeriod = periods.find(
      ([from, to]) => currentDay >= from && currentDay <= to
    );
    const [date1, date2] = currentPeriod ?? [1, 5];
    return { date1, date2 };
  }
  return { date1: 1, date2: 5 };
}

export async function createRecipientsList(orderDraft, filters, restrictedRecipients, t) {
  const occasion = await Occasion.findOne({ where: { id: orderDraft.occasionId }, transaction: t })
  const amount = orderDraft.amount;
  //const occasionType = orderDraft.occasionType;
  const recipientIds = [];
  let proportion = getProportion(occasion.occasionType, amount, filters);
  const maxOneHome = filters.maxFromOneHouse
    ? filters.maxFromOneHouse
    : ((filters.regions?.length || filters.homes?.length)
      ? null
      : Math.ceil(amount * 0.2));
  const maxOneRegion = filters.regions?.length ? null : Math.ceil(amount * 0.3);

  const restrictedHomes = new Set();
  const restrictedRegions = new Set();

  const homeCounts = new Map();
  const regionCounts = new Map();

  let { date1, date2 } = getDefaultDates(occasion.month);
  if (filters.date1 || filters.date2) {
    date1 = filters.date1 ?? (amount >= 50 ? 1 : Math.max(filters.date2 - 5, 1));
    date2 = filters.date2 ?? (amount >= 50 ? 31 : Math.min(filters.date1 + 5, 31));
  }

  const where = {
    occasionId: orderDraft.occasionId,
    isAbsent: false,
    daySnapshot: { [Op.between]: [date1 - 1, date2 + 1], }
  };
  if (filters.addressCategory === 2) where.acceptableForSchool = true;
  if (filters.onlyWithPicture === true) where['$senior.photoLink$'] = { [Op.not]: null };
  if (filters.onlyAnniversaries === true) where.specialComment = { [Op.like]: 'юбилей%' };
  if (filters.onlyAnniversariesAndOldest === true) where.specialComment = { [Op.not]: null };
  if (filters.onlyWithConcents === true) where['$senior.dateOfConcent$'] = { [Op.not]: null };
  if (filters.year1 || filters.year2) {
    const year1 = filters.year1 ?? 1900;
    const year2 = filters.year2 ?? new Date().getFullYear();
    where.yearSnapshot = { [Op.between]: [year1 - 1, year2 + 1], };
  }

  for (const [mainCategory, propAmount] of Object.entries(proportion)) {

    for (let i = 1; i <= propAmount; i++) {
      let recipient;
      const searchCategories = getReplacementCategories(mainCategory, filters);

      console.log('OOO searchCategories', searchCategories)

      for (const category of searchCategories) {
        where.category = category;
        const maxPlusAmount = 15;
        let whereHomeIdSnapshot = {};
        let whereRegionIdSnapshot = {};

        if (filters.homes?.length) {
          whereHomeIdSnapshot = {
            [Op.notIn]: [...restrictedHomes],
            [Op.in]: filters.homes,
          };
        } else {
          whereHomeIdSnapshot = {
            [Op.notIn]: [...restrictedHomes],
          };
        }

        if (filters.regions?.length) {
          whereRegionIdSnapshot = {
            [Op.notIn]: [...restrictedRegions],
            [Op.in]: filters.regions,
          };
        } else {
          whereRegionIdSnapshot = {
            [Op.notIn]: [...restrictedRegions],
          };
        }

        //  for (let p = 1; p <= maxPlusAmount; p++) {
        const recipientWhere = {
          ...where,
          category,
          plusAmount: { [Op.lt]: maxPlusAmount },
          id: { [Op.notIn]: restrictedRecipients },
          homeIdSnapshot: whereHomeIdSnapshot,
          regionIdSnapshot: whereRegionIdSnapshot,
        };
        recipient = await Recipient.findOne(
          {
            where: recipientWhere,
            attributes: ['id', 'homeIdSnapshot', 'regionIdSnapshot', 'seniorId'],
            order: [['plusAmount', 'ASC']],
          },
        );
        if (recipient) {
          await recipient.increment('plusAmount', { by: 1 });
          recipientIds.push(recipient);
          restrictedRecipients.push(recipient.id);

          const homeId = recipient.homeIdSnapshot;
          const regionId = recipient.regionIdSnapshot;

          if (homeId !== null && maxOneHome !== null) {
            const homeCount = (homeCounts.get(homeId) ?? 0) + 1;
            homeCounts.set(homeId, homeCount);

            if (homeCount >= maxOneHome) {
              restrictedHomes.add(homeId);
            }
          }

          if (regionId !== null && maxOneRegion !== null) {
            const regionCount = (regionCounts.get(regionId) ?? 0) + 1;
            regionCounts.set(regionId, regionCount);

            if (regionCount >= maxOneRegion) {
              restrictedRegions.add(regionId);
            }
          }
          break;
        }
        // }
        //if (recipient) break;
      }

      if (!recipient) {
        await Recipient.decrement('plusAmount', {
          by: 1,
          where: { id: { [Op.in]: recipientIds.map(r => r.id) } },
        });
        return [];
      };
    }
  }
  return recipientIds;
}
