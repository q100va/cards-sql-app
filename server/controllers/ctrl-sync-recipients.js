import { Op } from "sequelize";
import { Recipient, Occasion, Senior, Home, HomeAddress, Region } from "../models/index.js";
import { generateRecipients } from "./ctrl-generate-recipients.js";
import { addRecipients } from "./ctrl-check-recipients.js";
import { buildFullName, getCategory, getSpecialComment } from './ctrl-common-helpers.js';
import {
  OCCASION_TYPE,
} from '../../shared/dist/constants/occasions.js';
import CustomError from "../shared/customError.js";

export async function editActiveRecipient(
  seniorId,
  changes,
  t,
) {
  const senior = await Senior.findByPk(seniorId, {
    include: [
      {
        model: Home,
        as: 'home',
        attributes: [
          'noAddress',
          'specialHome',
          'acceptableForSchool',
          'isRestricted',
          'isClose',
        ],
      },
    ],
    transaction: t,
  });

  if (!senior) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

  const home = senior.home;

  const [, birthMonth] = senior.birthDate
    .split('-')
    .map(Number);

  const activeOccasions = await Occasion.findAll({
    where: {
      status: 1,
    },
    attributes: [
      'id',
      'type',
      'month',
      'year',
    ],
    transaction: t,
  });

  const activeOccasionIds = activeOccasions.map(
    (occasion) => occasion.id,
  );

  const activeRecipients = await Recipient.findAll({
    where: {
      seniorId,
      occasionId: {
        [Op.in]: activeOccasionIds,
      },
    },
    include: [
      {
        model: Occasion,
        as: 'occasion',
        attributes: [
          'type',
          'year',
        ],
      },
    ],
    transaction: t,
  });

  let absentRecipientIds = [];

  const seniorIsActive =
    senior.dateOfExit === null &&
    senior.isRestricted === false &&
    home.isRestricted === false &&
    home.isClose === false;

  if (seniorIsActive) {
    // TODO: Add support for other occasion types.
    const actualBirthday = activeOccasions.find(
      (occasion) =>
        occasion.type === OCCASION_TYPE.BIRTHDAY &&
        occasion.month === birthMonth,
    );

    if (actualBirthday) {
      const birthdayRecipientExists =
        activeRecipients.some(
          (recipient) =>
            recipient.occasionId === actualBirthday.id,
        );

      if (!birthdayRecipientExists) {
        const rows = await generateRecipients(
          actualBirthday,
          t,
          [seniorId],
        );

        const created = await Recipient.bulkCreate(
          rows,
          {
            transaction: t,
            individualHooks: true,
          },
        );

        await Occasion.increment(
          {
            amount: created.length,
          },
          {
            where: {
              id: actualBirthday.id,
            },
            transaction: t,
          },
        );
      }

      absentRecipientIds = activeRecipients
        .filter(
          (recipient) =>
            recipient.occasion.type ===
            OCCASION_TYPE.BIRTHDAY &&
            recipient.occasionId !==
            actualBirthday.id,
        )
        .map((recipient) => recipient.id);
    } else {
      absentRecipientIds = activeRecipients
        .filter(
          (recipient) =>
            recipient.occasion.type ===
            OCCASION_TYPE.BIRTHDAY,
        )
        .map((recipient) => recipient.id);
    }
  }

  if (!activeRecipients.length) return;

  const [
    birthYear,
    currentBirthMonth,
    birthDay,
  ] = senior.birthDate.split('-').map(Number);

  for (const recipient of activeRecipients) {
    const payload = {};

    if (
      changes.firstName !== undefined ||
      changes.patronymic !== undefined ||
      changes.lastName !== undefined
    ) {
      payload.fullNameSnapshot = buildFullName(senior);
    }

    if (
      changes.gender !== undefined ||
      changes.personalNoAddr !== undefined ||
      changes.birthDate !== undefined
    ) {
      payload.category = getCategory(
        senior,
        birthYear,
        recipient.occasion.year,
      );

      if (changes.birthDate !== undefined) {
        payload.daySnapshot = birthDay;
        payload.monthSnapshot = currentBirthMonth;
        payload.yearSnapshot =
          birthYear !== 1800
            ? birthYear
            : null;

        payload.specialComment =
          birthYear !== 1800
            ? getSpecialComment(
              birthYear,
              recipient.occasion.year,
            )
            : '';
      }
    }

    payload.isAbsent =
      home.isRestricted === false &&
        home.isClose === false
        ? senior.dateOfExit === null
          ? senior.isRestricted
          : true
        : true;

    await recipient.update(payload, {
      transaction: t,
      individualHooks: true,
    });
  }

  if (absentRecipientIds.length) {
    await Recipient.update(
      {
        isAbsent: true,
      },
      {
        where: {
          id: {
            [Op.in]: absentRecipientIds,
          },
        },
        transaction: t,
        individualHooks: true,
      },
    );
  }
}

export async function editHomeActiveRecipients(
  homeId,
  changes,
  t,
) {
  const home = await Home.findByPk(homeId, {
    include: [
      {
        model: HomeAddress,
        as: 'activeAddress',
        attributes: [
          'fullPostalAddress',
        ],
        include: [
          {
            model: Region,
            attributes: ['id'],
          },
        ],
      },
    ],
    transaction: t,
  });

  if (!home) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

  const activeRecipients = await Recipient.findAll({
    where: {
      homeIdSnapshot: homeId,
    },
    include: [
      {
        model: Occasion,
        as: 'occasion',
        where: {
          status: 1,
        },
        attributes: [
          'type',
          'month',
          'year',
        ],
        required: true,
      },
      {
        model: Senior,
        as: 'senior',
        attributes: [
          'dateOfExit',
          'isRestricted',
          'personalNoAddr',
          'gender',
        ],
        include: [
          {
            model: Home,
            as: 'home',
            attributes: [
              'specialHome',
              'noAddress',
            ],
            required: true,
          },
        ],
      },
    ],
    transaction: t,
  });

  for (const recipient of activeRecipients) {
    const payload = {
      regionIdSnapshot:
        home.activeAddress.region.id,

      addressSnapshot:
        home.activeAddress.fullPostalAddress,

      acceptableForSchool:
        home.acceptableForSchool,

      category: getCategory(
        {
          personalNoAddr:
            recipient.senior.personalNoAddr,

          home: {
            specialHome: home.specialHome,
            noAddress: home.noAddress,
          },

          gender: recipient.senior.gender,
        },
        recipient.yearSnapshot,
        recipient.occasion.year,
      ),

      isAbsent:
        home.isRestricted === false &&
          home.isClose === false
          ? recipient.senior.dateOfExit === null
            ? recipient.senior.isRestricted
            : true
          : true,
    };

    await recipient.update(payload, {
      transaction: t,
      individualHooks: true,
    });
  }

  if (
    Object.keys(changes).length > 0 &&
    (
      (
        changes.isClose === false &&
        home.isRestricted === false
      ) ||
      (
        changes.isRestricted === false &&
        home.isClose === false
      )
    )
  ) {
    const activeOccasions = await Occasion.findAll({
      where: {
        status: 1,
      },
      attributes: [
        'id',
        'type',
        'month',
        'year',
      ],
      transaction: t,
    });

    for (const occasion of activeOccasions) {
      await addRecipients(
        occasion,
        t,
        homeId,
      );
    }
  }
}
