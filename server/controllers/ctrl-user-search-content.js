import { Country, District, Locality, Region, Role, User, UserAddress, UserContact } from '../models/index.js';
import { createSearchStringFor } from './ctrl-search-string.js';

export async function buildUserSearchContent(userId, transaction) {
  const freshUser = await User.findByPk(userId, {
    attributes: {
      exclude: [
        'password',
        'failedLoginCount',
        'lockedUntil',
        'bruteWindowStart',
        'bruteStrikeCount',
        'createdAt',
        'updatedAt',
      ],
    },
    include: [
      {
        model: Role,
        attributes: ['name'],
      },
      {
        model: UserContact,
        as: 'contacts',
        attributes: ['content', 'isRestricted'],
      },
      {
        model: UserAddress,
        as: 'addresses',
        attributes: ['isRestricted'],
        include: [
          { model: Country, attributes: ['name'] },
          { model: Region, attributes: ['name'] },
          { model: District, attributes: ['name'] },
          { model: Locality, attributes: ['name'] },
        ],
      },
    ],
    transaction,
  });

  return createSearchStringFor('user', freshUser);
}
