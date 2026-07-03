import { RECIPIENT_STATUS } from "../../shared/dist/constants/orders.js";
import { Home, OrderRecipient, Recipient, Senior } from "../models/index.js";



export async function transformOrderRecipientsPart(orderId, t) {
  const recipients = await OrderRecipient.findAll(
    {
      where: { orderId },
      attributes: ["recipientStatus", "homeId"],
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
      recipientId: r.recipient.id,
      fullNameSnapshot: r.recipient.fullNameSnapshot,
      specialComment: r.recipient.specialComment,
      birthDay: r.recipient.daySnapshot,
      birthMonth: r.recipient.monthSnapshot,
      birthYear: r.recipient.yearSnapshot,
      infoNote: r.senior.infoNote ? '(' + r.senior.infoNote + ')' : r.senior.infoNote,
      photoLink: r.senior.photoLink,
      recipientStatus: RECIPIENT_STATUS[r.recipientStatus]
      //dateOfBirthday: recipient.yearSnapshot + '-' + recipient.monthSnapshot + '-' + recipient.daySnapshot
    }
    list[index].homeRecipients.push(homeRecipient);
  }
  console.log('ARRAY', list);
  return list;
}

export async function transformOrderDisplayParts(orderId) { }
