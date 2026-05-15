import { Op } from "sequelize";
import { Recipient, Occasion, Senior, Home, HomeAddress, Region } from "../models/index.js";
import { fullName, generateRecipients, getCategory, getSpecialComment } from "./ctrl-generate-recipients.js";
import { addRecipients } from "./ctrl-check-recipients.js";


export async function editActiveRecipient(seniorId, changes, t) {
  const senior = await Senior.findByPk(seniorId, {
    include: [
      {
        model: Home,
        as: 'home',
        attributes: ['noAddress', 'specialHome', 'acceptableForSchool'],
        /*         include: [
                  {
                    model: HomeAddress,
                    as: 'activeAddress',
                    attributes: ['fullPostalAddress'],
                    include: [
                      { model: Region, attributes: ['id'] },
                    ]
                  }
                ] */
      }
    ],
    transaction: t
  });
  const home = await Home.findByPk(senior.homeId, { transaction: t });
  const month = Number(senior.birthDate.split('-')[1]);
  const activeOccasions = await Occasion.findAll({
    where: {status: 1},
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    transaction: t,
  });
  const occasionsIds = activeOccasions.map(o => o.id);
  const activeRecipients = await Recipient.findAll({
    where: { seniorId, occasionId: { [Op.in]: occasionsIds } },
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    include: [
      {
        model: Occasion,
        as: 'occasion',
        attributes: ['type'],
      }
    ],
    transaction: t,
  });
  let deletingIds = [];
  if (senior.dateOfExit === null && senior.isRestricted === false && home.isRestricted === false && home.isClose === false) {
    //TODO: for NY, 23, 8, Easter, 9

    const actualBirthday = activeOccasions.find(o => o.month === month);
    if (actualBirthday) {
      if (!activeRecipients.find(r => r.occasionId === actualBirthday.id)) {
        const rows = await generateRecipients(actualBirthday, t, [seniorId]);
        const created = await Recipient.bulkCreate(rows, { transaction: t, individualHooks: true, });
        await Occasion.increment(
          { amount: created.length },
          {
            where: { id: actualBirthday.id },
            transaction: t,
          }
        );
      }
      deletingIds = (activeRecipients.filter(r => r.occasion.type === 1 && r.occasionId !== actualBirthday.id)).map(i => i.id);
    } else {
      deletingIds = (activeRecipients.filter(r => r.occasion.type === 1)).map(i => i.id);
    }
  }
  if (!activeRecipients.length) return;

  const payload = {};

  if (changes.firstName !== undefined || changes.patronymic !== undefined || changes.lastName !== undefined) {
    payload.fullNameSnapshot = fullName(senior);
  }
  if (changes.gender !== undefined || changes.personalNoAddr !== undefined || changes.birthDate !== undefined) {
    const [year, month, day] = senior.birthDate.split('-').map(Number);
    payload.category = getCategory(senior, year, month);
    if (changes.birthDate !== undefined) {
      payload.daySnapshot = day;
      payload.monthSnapshot = month;
      payload.yearSnapshot = year !== 1800 ? year : null;
      payload.specialComment = year !== 1800 ? getSpecialComment(senior, month) : '';
    }
  }

  payload.isAbsent = (
    home.isRestricted === false && home.isClose === false
  ) ? (
    senior.dateOfExit === null ? (
      senior.isRestricted
    ) : true
  ) : true;


  /*   if (changes.dateOfExit !== undefined) {
      if (changes.dateOfExit !== null) {
        payload.isAbsent = true;
      } else {
        payload.isAbsent = (
          home.isRestricted === false && home.isClose === false
        ) ? senior.isRestricted : true;
      }
    } else if (changes.isRestricted !== undefined) {
      if (senior.dateOfExit !== null) {
        payload.isAbsent = true;
      } else {
        payload.isAbsent = (
          home.isRestricted === false && home.isClose === false
        ) ? changes.isRestricted : true;
      }
    }
   */
  await Recipient.update(
    payload,
    {
      where: { id: { [Op.in]: activeRecipients.map(r => r.id) } },
      transaction: t,
      individualHooks: true, // ensure per-row hooks/audit
    }
  );

  if (deletingIds.length) {
    await Recipient.update(
      { isAbsent: true },
      {
        where: { id: { [Op.in]: deletingIds } },
        transaction: t,
        individualHooks: true, // ensure per-row hooks/audit
      }
    );
  }
}

export async function editHomeActiveRecipients(homeId, changes, t) {
  const home = await Home.findByPk(homeId, {
    include: [
      {
        model: HomeAddress,
        as: 'activeAddress',
        attributes: ['fullPostalAddress'],
        include: [
          { model: Region, attributes: ['id'] },
        ]
      }
    ],
    transaction: t
  });
  const activeRecipients = await Recipient.findAll({
    where: { homeIdSnapshot: homeId, },
    attributes: {
      exclude: [
        'createdAt',
        'updatedAt']
    },
    include: [
      {
        model: Occasion,
        as: 'occasion',
        where: { status: 1, },
        attributes: ['type', 'month'],
        required: true
      },
      {
        model: Senior,
        as: 'senior',
        attributes: ['dateOfExit', 'isRestricted', 'personalNoAddr', 'gender'],
        include: [
          {
            model: Home,
            as: 'home',
            attributes: ['specialHome', 'noAddress'],
            required: true
          },]
      }
    ],
    transaction: t,
  });

  const payload = {
    regionIdSnapshot: home.activeAddress.region.id,
    addressSnapshot: home.activeAddress.fullPostalAddress,
    acceptableForSchool: home.acceptableForSchool,
  };

  for (const recipient of activeRecipients) {

    payload.category = getCategory({
      personalNoAddr: recipient.senior.personalNoAddr,
      home: {
        specialHome: home.specialHome,
        noAddress: home.noAddress
      },
      gender: recipient.senior.gender
    },
      recipient.yearSnapshot,
      recipient.monthSnapshot);
    payload.isAbsent = (
      home.isRestricted === false && home.isClose === false
    ) ? (
      recipient.senior.dateOfExit === null ? (
        recipient.senior.isRestricted
      ) : true
    ) : true;
    console.log('payload', payload);
    await recipient.update(payload, {
      transaction: t,
      individualHooks: true,
    });
  }

  if (Object.keys(changes).length > 0) {
    if (
      (changes.isClose === false && home.isRestricted === false) ||
      (changes.isRestricted === false && home.isClose === false)
    ) {
      const activeOccasions = await Occasion.findAll({
        where: {status: 1},
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
        transaction: t,
      });
       console.log('activeOccasions', activeOccasions);
      for (const occasion of activeOccasions) {
        await addRecipients(occasion, t, homeId);
      }
    }
  }

}
