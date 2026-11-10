import { Op } from "sequelize";
import { Recipient, Occasion, Senior, Home, HomeAddress, Region } from "../models/index.js";
import { generateRecipients } from "./ctrl-generate-recipients.js";
import { addRecipients } from "./ctrl-check-recipients.js";
import { buildFullName, getCategory, getSpecialComment } from './ctrl-common-helpers.js';
import {
  OCCASION_TYPE,
} from '../../shared/dist/constants/occasions.js';
import CustomError from "../shared/customError.js";

export async function syncRecipientsAfterSeniorUpdate(
  seniorId,
  changes,
  transaction,
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
    transaction,
  });

  if (!senior) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

  const home = senior.home;

  const birthDateParts = senior.birthDate
    ? senior.birthDate.split('-').map(Number)
    : null;

  const birthMonth = birthDateParts?.[1] ?? null;

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
    transaction,
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
    transaction,
  });

  let absentRecipientIds = [];

  const seniorIsActive =
    senior.dateOfExit === null &&
    senior.isRestricted === false &&
    home.isRestricted === false &&
    home.isClose === false;

  if (seniorIsActive) {
    // TODO: Add support for other occasion types.
    const actualBirthday = birthMonth !== null
      ? activeOccasions.find(
        (occasion) =>
          occasion.type === OCCASION_TYPE.BIRTHDAY &&
          occasion.month === birthMonth,
      )
      : null;

    if (actualBirthday) {
      const birthdayRecipientExists =
        activeRecipients.some(
          (recipient) =>
            recipient.occasionId === actualBirthday.id,
        );

      if (!birthdayRecipientExists) {
        const rows = await generateRecipients(
          actualBirthday,
          transaction,
          [seniorId],
        );

        const created = await Recipient.bulkCreate(
          rows,
          {
            transaction,
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
            transaction,
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
  ] = birthDateParts ?? [null, null, null];

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
      birthDateParts &&
      (
        changes.gender !== undefined ||
        changes.personalNoAddr !== undefined ||
        changes.birthDate !== undefined
      )
    ) {
      payload.category = getCategory(
        senior,
        birthYear,
        recipient.occasion.year,
      );
    }

    if (changes.birthDate !== undefined) {
      if (birthDateParts) {
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
      } else {
        payload.daySnapshot = null;
        payload.monthSnapshot = null;
        payload.yearSnapshot = null;
        payload.specialComment = '';
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
      transaction,
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
        transaction,
        individualHooks: true,
      },
    );
  }
}

export async function syncRecipientsAfterHomeUpdate(
  homeId,
  changes,
  transaction,
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
    transaction,
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
    transaction,
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
      transaction,
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
      transaction,
    });

    for (const occasion of activeOccasions) {
      await addRecipients(
        occasion,
        transaction,
        homeId,
      );
    }
  }
}
