import { Op } from 'sequelize';
import { Region, Home, } from '../models/index.js';

const RECIPIENT_ORDER_FIELDS = {
  fullName: 'fullNameSnapshot',
  birthDay: 'daySnapshot',
  birthMonth: 'monthSnapshot',
  birthYear: 'yearSnapshot',
  plusAmount: 'plusAmount',
  category: 'category',
  specialComment: 'specialComment',

  regionName: [
    { model: Region, as: 'snapshotRegion' },
    'name',
  ],

  homeName: [
    { model: Home, as: 'snapshotHome' },
    'homeName',
  ],
};

function escapeLikeValue(value) {
  return String(value).replace(/([_%\\])/g, '\\$1');
}

export function buildRecipientOrderField(field) {
  return RECIPIENT_ORDER_FIELDS[field] ?? 'homeIdSnapshot';
}

export function buildGlobalSearchWhere(search) {
  const raw = String(search ?? '').trim();

  if (!raw) return null;

  const value = `%${escapeLikeValue(raw)}%`;

  return {
    [Op.or]: [
      { fullNameSnapshot: { [Op.iLike]: value } },
      { addressSnapshot: { [Op.iLike]: value } },
      { specialComment: { [Op.iLike]: value } },
      { category: { [Op.iLike]: value } },
      { '$snapshotHome.homeName$': { [Op.iLike]: value } },
      {
        '$snapshotRegion.name$': {
          [Op.iLike]: value,
        },
      },
    ],
  };
}
