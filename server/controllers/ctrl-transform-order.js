import { Op } from "sequelize";
import {
  Home,
  OrderRecipient,
  Recipient,
  Senior,
} from "../models/index.js";
import {
  ORDER_STATUSES,
  ORDER_RECIPIENT_STATUSES,
  ORDER_SOURCES,
  ORDER_RECIPIENT_STATUS,
} from '../../shared/dist/constants/orders.js';
import { transformOccasionDisplayParts } from "./ctrl-transform-occasion.js";

function buildFullName(owner) {
  return [owner?.lastName, owner?.firstName, owner?.patronymic]
    .filter(Boolean)
    .join(" ");
}

function buildOccasionName(occasion) {
  const display = transformOccasionDisplayParts(occasion);
  return [display.type, display.monthNameKey, display.year].filter(Boolean).join(" ");
}

export async function transformOrderRecipientsPart(order, t) {
  const recipients = await OrderRecipient.findAll({
    where: {
      orderId: order.id,
      recipientStatus: {
        [Op.not]: ORDER_RECIPIENT_STATUS.DELETED,
      },
    },
    attributes: [
      'id',
      'recipientStatus',
      'homeId',
    ],
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
          'category',
        ],
      },
      {
        model: Home,
        as: 'home',
        attributes: [
          'infoNote',
          'noAddress',
          'specialHome',
        ],
      },
      {
        model: Senior,
        as: 'senior',
        attributes: [
          'infoNote',
          'photoLink',
          'personalNoAddr',
        ],
      },
    ],
    order: [
      [
        { model: Recipient, as: 'recipient' },
        'category',
        'ASC',
      ],
      ['homeId', 'ASC'],
      [
        { model: Recipient, as: 'recipient' },
        'daySnapshot',
        'ASC',
      ],
    ],
    transaction: t,
  });

  const groups = new Map();

  let recipientIndex = 1;

  for (const row of recipients) {
    const personalNoAddr = row.senior.personalNoAddr;

    const groupKey = `${row.homeId}:${personalNoAddr}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        homeId: row.homeId,
        postAddress: row.recipient.addressSnapshot,
        infoNote: row.home.infoNote,
        noAddressNote:
          row.home.noAddress ||
            row.home.specialHome ||
            personalNoAddr
            ? 'ORDER.CARD.NO_ADDRESS_NOTE'
            : null,
        homeRecipients: [],
      });
    }

    const group = groups.get(groupKey);

    group.homeRecipients.push({
      index: recipientIndex++,
      id: row.id,
      fullNameSnapshot: row.recipient.fullNameSnapshot,
      specialComment: row.recipient.specialComment,
      birthDay: row.recipient.daySnapshot,
      birthMonth: row.recipient.monthSnapshot,
      birthYear: row.recipient.yearSnapshot,
      infoNote: row.senior.infoNote
        ? `(${row.senior.infoNote})`
        : null,
      photoLink: row.senior.photoLink,
      status: ORDER_RECIPIENT_STATUSES[row.recipientStatus]?.key ?? "",
      statusId: row.recipientStatus,
    });
  }

  return [...groups.values()];
}

export function transformOrderDisplayPart(order) {
  return {
    id: order.id,
    date: order.createdAt,
    amount: order.amount,
    userName: order.user?.userName ?? "",
    volunteerName: buildFullName(order.volunteer),
    instituteName: order.institute
      ? `${order.institute.instituteName} - ${order.institute.category}`
      : null,
    contact: `${order.contact.content} - ${order.contact.type}`,
    status: ORDER_STATUSES[order.status]?.key ?? "",
    statusId: order.status,
    source: ORDER_SOURCES[order.source]?.key ?? "",
    occasion: buildOccasionName(order.occasion),
    occasionStatus: order.occasion.status,
    comment: order.comment
  };
}

export async function transformOrder(order, t) {
  const displayPart = transformOrderDisplayPart(order);
  const recipients = await transformOrderRecipientsPart(order, t);

  return {
    ...displayPart,
    recipients,
  };
}
