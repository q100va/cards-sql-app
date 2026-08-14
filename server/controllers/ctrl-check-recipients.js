import { Op } from "sequelize";
import { Occasion, Recipient, Home } from "../models/index.js";
import { generateRecipients, getSeniors } from "./ctrl-generate-recipients.js";

function buildFullData(recipient) {
  const homeName = recipient.snapshotHome.homeName;
  const fullName = recipient.fullNameSnapshot;
  const birthDate =
      recipient.monthSnapshot &&
      recipient.daySnapshot
      ? [
        recipient.yearSnapshot !== null ? recipient.yearSnapshot : '?',
        String(recipient.monthSnapshot).padStart(2, '0'),
        String(recipient.daySnapshot).padStart(2, '0'),
      ].join('-')
      : '';

  return [homeName, fullName, birthDate]
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function transformRecipientList(items, t) {
  if (!items.length) return [];

  const ids = items.map((item) => item.id);

  const recipients = await Recipient.findAll({
    where: {
      id: {
        [Op.in]: ids,
      },
    },
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: [
      {
        model: Home,
        as: 'snapshotHome',
        attributes: ['homeName'],
      },
    ],
    transaction: t,
  });

  return recipients.map((recipient) => ({
    id: recipient.id,
    fullData: buildFullData(recipient),
  }));
}

export async function addRecipients(occasion, t, homeId = null) {
  let seniors = await getSeniors(occasion, t);
  if (homeId !== null) seniors = seniors.filter(s => s.homeId === homeId);
  const seniorIds = seniors.map((senior) => senior.id);

  const activeWhere = { occasionId: occasion.id, isAbsent: false };
  if (homeId !== null) activeWhere.homeIdSnapshot = homeId;

  const recipients = await Recipient.findAll({
    where: activeWhere,
    attributes: ['seniorId'],
    transaction: t,
  });
  const activeSeniorIds = new Set(
    recipients.map((recipient) => recipient.seniorId),
  );
  const missingSeniorIds = seniorIds.filter(
    (id) => !activeSeniorIds.has(id),
  );

  const absentWhere = { occasionId: occasion.id, isAbsent: true };
  if (homeId !== null) absentWhere.homeIdSnapshot = homeId;

  const absent = await Recipient.findAll({
    where: absentWhere,
    attributes: ['seniorId'],
    transaction: t,
  });
  const absentSeniorIds = absent.map(
    (recipient) => recipient.seniorId,
  );

  const missingSeniorIdsSet = new Set(missingSeniorIds);

  // Separate returning recipients from new recipients.
  const returningSeniorIds = absentSeniorIds.filter((id) =>
    missingSeniorIdsSet.has(id),
  );
  const returningSeniorIdsSet = new Set(returningSeniorIds);

  const newSeniorIds = missingSeniorIds.filter(
    (id) => !returningSeniorIdsSet.has(id),
  );

  let updated = [];
  let created = [];
  if (returningSeniorIds.length) {
    const [_count, rows] = await Recipient.update(
      {
        isAbsent: false,
      },
      {
        where: {
          occasionId: occasion.id,
          seniorId: {
            [Op.in]: returningSeniorIds,
          },
        },
        transaction: t,
        individualHooks: true,
        returning: true,
      },
    );
    updated = rows;
  }

  if (newSeniorIds.length) {
    const rows = await generateRecipients(occasion, t, newSeniorIds);
    created = await Recipient.bulkCreate(rows, { transaction: t, individualHooks: true, });

    await Occasion.increment(
      { amount: created.length },
      {
        where: { id: occasion.id },
        transaction: t,
      }
    );
  }
  const added = await transformRecipientList(created, t);
  const returned = await transformRecipientList(updated, t);
  return {
    added,
    returned
  };
}

export async function markAbsentRecipients(occasion, t, homeId = null) {
  let seniors = await getSeniors(occasion, t);
  if (homeId !== null) seniors = seniors.filter(s => s.homeId === homeId);
  const currentSeniorIds = new Set(
    seniors.map((senior) => senior.id),
  );

  const activeWhere = { occasionId: occasion.id, isAbsent: false };
  if (homeId !== null) activeWhere.homeIdSnapshot = homeId;

  const activeRecipients = await Recipient.findAll({
    where: activeWhere,
    attributes: ['seniorId'],
    transaction: t,
  });

  const activeSeniorIds = activeRecipients.map(
    (recipient) => recipient.seniorId,
  );
  const absentSeniorIds = activeSeniorIds.filter(
    (id) => !currentSeniorIds.has(id),
  );

  let updatedRecipients = [];
  if (absentSeniorIds.length) {
    const [_count, rows] = await Recipient.update(
      {
        isAbsent: true
      },
      {
        where: {
          occasionId: occasion.id,
          seniorId: { [Op.in]: absentSeniorIds }
        },
        transaction: t,
        individualHooks: true,
        returning: true,
      }
    );
    updatedRecipients = rows;
  }
  return transformRecipientList(updatedRecipients, t);
}
