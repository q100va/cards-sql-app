import { Op } from 'sequelize';
import CustomError from "../shared/customError.js";
import { Senior, Home, HomeAddress, Region } from "../models/index.js";
import { OCCASION_TYPE } from '../../shared/dist/constants/occasions.js';
import { getByBirthMonth, buildFullName, getCategory, getSpecialComment } from './ctrl-common-helpers.js';

async function getBirthdaySeniors(occasion, t, seniorIds) {
  const where = {
    [Op.and]: [
      getByBirthMonth(occasion.month),
      { dateOfExit: null },
      { isRestricted: false }
    ],
  };
  if (seniorIds.length) where[Op.and].push({ id: { [Op.in]: seniorIds } });

  return Senior.findAll({
    where,
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    transaction: t,
    include: [
      {
        model: Home,
        as: 'home',
        required: true,
        where: {
          isRestricted: false,
          isClose: false,
        },
        attributes: ['noAddress', 'specialHome', 'acceptableForSchool'],
        include: [
          {
            model: HomeAddress,
            as: 'activeAddress',
            attributes: ['fullPostalAddress'],
            where: { isRestricted: false },
            include: [
              { model: Region, attributes: ['id'] },
            ]
          }
        ]
      }
    ]
  });
}

// TODO: Add recipient generation for other occasion types.
export async function getSeniors(occasion, t, seniorIds = []) {
  switch (occasion.type) {
    case OCCASION_TYPE.BIRTHDAY:
      return getBirthdaySeniors(occasion, t, seniorIds);
    default:
      throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 400);
  }
}

async function generateBirthdayRecipients(occasion, t, seniorIds) {
  const seniors = await getBirthdaySeniors(
    occasion,
    t,
    seniorIds,
  );

  if (!seniors.length) { throw new CustomError('ERRORS.DATA_NOT_FOUND', 404); }

  const rows = seniors.map(s => {
    const [year, month, day] = s.birthDate.split('-').map(Number);
    return {
      fullNameSnapshot: buildFullName(s),
      daySnapshot: day,
      monthSnapshot: month,
      yearSnapshot: year !== 1800 ? year : null,
      regionIdSnapshot: s.home.activeAddress.region.id,
      homeIdSnapshot: s.homeId,
      addressSnapshot: s.home.activeAddress.fullPostalAddress,
      category: getCategory(s, year, occasion.year),
      specialComment: year !== 1800 ? getSpecialComment(year, occasion.year) : '',
      acceptableForSchool: s.home.acceptableForSchool,
      isAbsent: false,
      plusAmount: 0,
      seniorId: s.id,
      occasionId: occasion.id
    }
  })
  return rows;
}

// TODO: Add recipient generation for other occasion types.
export async function generateRecipients(occasion, t, seniorIds = []) {
  switch (occasion.type) {
    case OCCASION_TYPE.BIRTHDAY:
      return generateBirthdayRecipients(occasion, t, seniorIds);
    default:
      throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 400);
  }
}
