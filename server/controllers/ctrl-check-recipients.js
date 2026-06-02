import { Op } from "sequelize";
import { Occasion, Recipient, Senior, Home } from "../models/index.js";
import { generateRecipients, getSeniors } from "./ctrl-generate-recipients.js";
import { transformRecipient } from "./ctrl-transform-recipient.js";

function fullData(row) {
  const hn = row.senior.home.homeName;
  const fn = row.fullNameSnapshot;
  const db = row.senior.birthDate ?? '';
  return [hn, fn, db].filter(Boolean).join(' ').trim();
}

async function transformRecipientList(arr, t) {
  if (!arr.length) return [];

  // console.log('arr', arr);
  const ids = arr.map(i => i.id);
  console.log('ids', ids);
  const recipients = await Recipient.findAll({
    where: { id: { [Op.in]: ids } },
    //where: { id: 92 },
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    include: [
      {
        model: Senior,
        as: 'senior',
        attributes: ['id', 'birthDate'],
        include: [
          {
            model: Home,
            as: 'home',
            attributes: ['homeName'],
          },
        ]
      },
    ],
    transaction: t,
  });
  console.log('recipients', recipients);
  const result = recipients.map(r => ({
    id: r.id,
    fullData: fullData(r)
  }));

  return result;
}

export async function addRecipients(occasion, t, homeId = null) {
  let seniors = await getSeniors(occasion, t);
  if (homeId !== null) seniors = seniors.filter(s => s.homeId === homeId);
  const seniorsIds = seniors.map(s => s.id);

  const whereRes = { occasionId: occasion.id, isAbsent: false };
  if (homeId !== null) whereRes.homeIdSnapshot = homeId;

  const recipients = await Recipient.findAll({
    where: whereRes,
    attributes: ['seniorId'],
    transaction: t,
  });
  const recipientsSet = new Set(recipients.map(r => r.seniorId));
  const result = seniorsIds.filter(id => !recipientsSet.has(id));
  console.log('result', result);

  const whereAbs = { occasionId: occasion.id, isAbsent: true };
  if (homeId !== null) whereAbs.homeIdSnapshot = homeId;

  const absent = await Recipient.findAll({
    where: whereAbs,
    attributes: ['seniorId'],
    transaction: t,
  });
  const absentIds = absent.map(r => r.seniorId);

  const resultToMark = absentIds.filter(id => (new Set(result)).has(id));
  const resultToAdd = result.filter(id => !(new Set(resultToMark)).has(id));

  console.log('resultToMark', resultToMark);
  console.log('resultToAdd', resultToAdd);

  let updated = [];
  let created = [];
  if (resultToMark.length) {
    const [_count, rows] = await Recipient.update(
      {
        isAbsent: false
      },
      {
        where: { occasionId: occasion.id, seniorId: { [Op.in]: resultToMark } },
        transaction: t,
        individualHooks: true, // ensure per-row hooks/audit
        returning: true,
      }
    );
    updated = rows;
  }

  if (resultToAdd.length) {
    const rows = await generateRecipients(occasion, t, resultToAdd);
    created = await Recipient.bulkCreate(rows, { transaction: t, individualHooks: true, });
    //console.log('created', created);
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
  console.log('added', added);
  console.log('returned', returned);
  return {
    added,
    returned
  };
}

export async function markAbsentRecipients(occasion, t, homeId = null) {
  let seniors = await getSeniors(occasion, t);
  if (homeId !== null) seniors = seniors.filter(s => s.homeId === homeId);
  const seniorsSet = new Set(seniors.map(s => s.id));

  const whereRes = { occasionId: occasion.id, isAbsent: false };
  if (homeId !== null) whereRes.homeIdSnapshot = homeId;

  const recipients = await Recipient.findAll({
    where: whereRes,
    attributes: ['seniorId'],
    transaction: t,
  });

  const recipientsIds = recipients.map(r => r.seniorId);

  const absent = recipientsIds.filter(id => !seniorsSet.has(id));
  console.log('absent', absent);
  let updated = [];
  if (absent.length) {
    const [_count, rows] = await Recipient.update(
      {
        isAbsent: true
      },
      {
        where: { occasionId: occasion.id, seniorId: { [Op.in]: absent } },
        transaction: t,
        individualHooks: true, // ensure per-row hooks/audit
        returning: true,
      }
    );
    updated = rows;
  }
  const list = await transformRecipientList(updated);
  return list;
}








/* function checkRecipientsDuplicates(rows) {
  const seen = new Set();

  for (const r of rows) {
    const key = `${r.occasionId}_${r.seniorId}`;

    if (seen.has(key)) {
      throw new CustomError('ERRORS.RECIPIENT.DUPLICATE_IN_LIST', 400);
    }

    seen.add(key);
  }
}

function findRecipientsDuplicates(rows) {
  const seen = new Set();
  const duplicates = [];

  for (const r of rows) {
    const key = `${r.occasionId}_${r.seniorId}`;

    if (seen.has(key)) {
      duplicates.push(r);
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}
 */
