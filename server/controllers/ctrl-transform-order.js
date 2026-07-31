//import { RECIPIENT_STATUS, SOURCES } from "../../shared/dist/constants/orders.js";
import { transformOccasionDisplayParts } from "./ctrl-transform-occasion.js";
import {
  Home,
  Institute,
  Order,
  OrderRecipient,
  Recipient,
  Senior,
  User,
  Volunteer,
  VolunteerContact,
} from "../models/index.js";
import { ORDER_STATUSES, RECIPIENT_STATUS, ORDER_SOURCES } from "./ctrl-order-query-builders.js";
import { Op } from "sequelize";

/* const ORDER_STATUS = {
  1: "ORDER.STATUS.PENDING",
  2: "ORDER.STATUS.ACCEPTED",
  3: "ORDER.STATUS.RETURNED",
  4: "ORDER.STATUS.OVERDUE",
}; */



function fullName(owner) {
  return [owner?.lastName, owner?.firstName, owner?.patronymic]
    .filter(Boolean)
    .join(" ");
}

function occasionName(occasion) {
  if (!occasion) return "";
  const display = transformOccasionDisplayParts(occasion);
  return [display.type, display.monthNameKey, display.year].filter(Boolean).join(" ");
}

function sourceKey(sourceId) {
  return ORDER_SOURCES[sourceId].key ?? "";
  //return ORDER_SOURCES.find((source) => source.id === sourceId)?.optionKey ?? "";
}


export async function transformOrderRecipientsPart(orderId, t) {
  const recipients = await OrderRecipient.findAll(
    {
      where: { orderId, recipientStatus: {[Op.not]: 3} },
      attributes: ["id", "recipientStatus", "homeId"],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'fullNameSnapshot',
            'homeIdSnapshot',
            'daySnapshot',
            'monthSnapshot',
            'yearSnapshot',
            'addressSnapshot',
            'specialComment',
            'category'
          ],
        },
        {
          model: Home,
          as: 'home',
          attributes: [
            'infoNote',
            'noAddress',
            'specialHome'
          ],
        },
        {
          model: Senior,
          as: 'senior',
          attributes: [
            'infoNote',
            'photoLink',
            'personalNoAddr'
          ],
        },

      ],
      order: [
        [{ model: Recipient, as: 'recipient' }, 'category', 'ASC'],
        ['homeId', 'ASC'],
        [{ model: Recipient, as: 'recipient' }, 'daySnapshot', 'ASC'],
      ],
      transaction: t,
    },
  );
  const list = [];
  let i = 1;

  for (const r of recipients) {

    let index = list.findIndex(
      h => (h.homeId === r.homeId &&
        h.personalNoAddr === r.senior.personalNoAddr)
    );
    /* console.log('r.homeId', r.homeId);
    console.log('r.recipient.personalNoAddr', r.recipient.personalNoAddr); */

    console.log('INDEX', index);
    if (index === -1) {
      list.push(
        {
          homeId: r.homeId,
          postAddress: r.recipient.addressSnapshot,
          personalNoAddr: r.senior.personalNoAddr,
          infoNote: r.home.infoNote,
          noAddressNote:
            r.home.noAddress || r.home.specialHome || r.senior.personalNoAddr
              ? 'ORDER.CARD.NO_ADDRESS_NOTE'
              : null,
          homeRecipients: []
        }
      )
      index = list.length - 1;
    }
    const homeRecipient = {
      index: i++,
      id: r.id,
      fullNameSnapshot: r.recipient.fullNameSnapshot,
      specialComment: r.recipient.specialComment,
      birthDay: r.recipient.daySnapshot,
      birthMonth: r.recipient.monthSnapshot,
      birthYear: r.recipient.yearSnapshot,
      infoNote: r.senior.infoNote ? '(' + r.senior.infoNote + ')' : r.senior.infoNote,
      photoLink: r.senior.photoLink,
      status: RECIPIENT_STATUS[r.recipientStatus],
      statusId: r.recipientStatus
      //dateOfBirthday: recipient.yearSnapshot + '-' + recipient.monthSnapshot + '-' + recipient.daySnapshot
    }
    list[index].homeRecipients.push(homeRecipient);
  }
  console.log('ARRAY', list);
  return list;
}

export async function transformOrderDisplayPart(orderId, t) {
  const order = await Order.findByPk(orderId, {
    attributes: {
      exclude: ["updatedAt"],
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "userName"],
      },
      {
        model: Volunteer,
        as: "volunteer",
        attributes: ["id", "firstName", "patronymic", "lastName"],
      },
      {
        model: Institute,
        as: 'institute',
        attributes: ['id', 'instituteName', 'category'],
      },
      {
        model: VolunteerContact,
        as: 'contact',
        attributes: ['id', 'content', 'type'],
      },
      {
        association: "occasion",
        attributes: ["id", "type", "month", "year", "status"],
      },
    ],
    transaction: t,
  });

  if (!order) return null;

  /*   const contact = await VolunteerContact.findByPk(order.contactId, {
      attributes: ["id", "content", "type"],
      transaction: t,
    }); */

  /*   const institute = order.instituteId ? await Institute.findByPk(order.instituteId, {
      attributes: ["id", "instituteName", "category"],
      transaction: t,
    }) : null; */

  return {
    id: order.id,
    date: order.createdAt,
    amount: order.amount,
    userName: order.user?.userName ?? "",
    volunteerName: fullName(order.volunteer),
    instituteName: order.instituteId ? (order.institute.instituteName + ' - ' + order.institute.category) : null,
    contact: order.contact.content + ' - ' + order.contact.type,
    status: ORDER_STATUSES[order.status].key ?? "",
    statusId: order.status,
    source: sourceKey(order.source),
    occasion: occasionName(order.occasion),
    occasionStatus: order.occasion.status,
    comment: order.comment
  };
}

export async function transformOrder(orderId, t) {
  const displayPart = await transformOrderDisplayPart(orderId, t);
  const recipients = await transformOrderRecipientsPart(orderId, t);

  return {
    ...displayPart,
    recipients: recipients,
  };
}
