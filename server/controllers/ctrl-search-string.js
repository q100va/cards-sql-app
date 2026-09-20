import {
  Volunteer,
  VolunteerAddress,
  VolunteerInstitute,
  VolunteerSubscription,
  VolunteerCooperation,
  VolunteerSearch,
  Country,
  District,
  Locality,
} from '../models/index.js';
import CustomError from '../shared/customError.js';
import { fullName } from './ctrl-create-owner-contacts-address.js';
import { INSTITUTE_CATEGORIES } from '../../shared/dist/constants/volunteers.js';

// ---------- helpers ----------
function pad2(n) {
  return String(n).padStart(2, '0');
}

function fmtDMY(year, month, day) {
  return `${pad2(day)}.${pad2(month)}.${year}`;
}

function fmtMDY(year, month, day) {
  return `${pad2(month)}/${pad2(day)}/${year}`;
}

/** Returns [YYYY-MM-DD, dd.MM.yyyy, MM/dd/yyyy] — TZ-safe */
export function dateVariants(dateValue) {
  if (!dateValue) return [];

  if (
    typeof dateValue === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
  ) {
    const [year, month, day] =
      dateValue.split('-').map(Number);

    const iso =
      `${year}-${pad2(month)}-${pad2(day)}`;

    return [
      iso,
      fmtDMY(year, month, day),
      fmtMDY(year, month, day),
    ];
  }

  const date =
    dateValue instanceof Date
      ? dateValue
      : new Date(dateValue);

  if (Number.isNaN(+date)) {
    return [];
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const iso =
    `${year}-${pad2(month)}-${pad2(day)}`;

  return [
    iso,
    fmtDMY(year, month, day),
    fmtMDY(year, month, day),
  ];
}

export function toSearchToken(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function pushAddressTokens(tokens, address) {
  if (!address) return;
  tokens.push(
    toSearchToken(address.country?.name),
    toSearchToken(address.region?.name ?? address.region?.shortName),
    toSearchToken(address.district?.name ?? address.district?.shortName),
    toSearchToken(address.locality?.name ?? address.locality?.shortName),
    toSearchToken(address.fullPostalAddress ?? ''),
  );
}

function normalizeSpace(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .trim();
}

function pushInstituteCategoryTokens(tokens, categoryId) {
  const category = INSTITUTE_CATEGORIES[categoryId];
  if (!category) return;

  tokens.push(toSearchToken(category.en), toSearchToken(category.ru));
}

// ---------- CONFIG per owner kind ----------
const OWNER_CONFIG = {
  user: {
    basicTokens: (user) => [
      toSearchToken(user?.userName),
      toSearchToken(user?.role?.name),
      toSearchToken(user?.firstName),
      toSearchToken(user?.patronymic),
      toSearchToken(user?.lastName),
      toSearchToken(user?.comment),
      user?.isRestricted
        ? 'заблокирован с blocked from'
        : 'активен active',
      ...dateVariants(user?.dateOfRestriction),
      toSearchToken(user?.causeOfRestriction),
      ...dateVariants(user?.dateOfStart),
    ],
    contacts: (user) => user?.contacts ?? [],
    addresses: (user) => user?.addresses ?? [],
    firstNonRestrictedAddress: (user) =>
      (user?.addresses ?? []).find((address) => !address?.isRestricted),
    pushAddressTokens: (tokens, address) => pushAddressTokens(tokens, address),
    outdatedNames: (user) =>
      (user?.outdatedNames ?? [])
        .flatMap((outdatedName) => [
          outdatedName.firstName,
          outdatedName.patronymic,
          outdatedName.lastName,
          outdatedName.userName])
        .filter(Boolean)
        .join(' '),
  },

  partner: {
    basicTokens: (partner) => [
      toSearchToken(partner?.firstName),
      toSearchToken(partner?.patronymic),
      toSearchToken(partner?.lastName),
      toSearchToken(partner?.affiliation),
      toSearchToken(partner?.position),
      toSearchToken(partner?.comment),
      partner?.isRestricted ? 'бывший former' : 'действующий active',
      ...dateVariants(partner?.dateOfRestriction),
      toSearchToken(partner?.causeOfRestriction),
      ...dateVariants(partner?.dateOfStart),
    ],
    contacts: (partner) => partner?.contacts ?? [],
    addresses: (partner) => partner?.addresses ?? [],
    firstNonRestrictedAddress: (partner) =>
      (partner?.addresses ?? []).find((address) => !address?.isRestricted),
    pushAddressTokens: (tokens, address) => pushAddressTokens(tokens, address),
    outdatedNames: (partner) =>
      (partner?.outdatedNames ?? [])
        .flatMap((outdatedName) => [
          outdatedName.firstName,
          outdatedName.patronymic,
          outdatedName.lastName])
        .filter(Boolean)
        .join(' '),
    coordinations: (partner) => partner?.coordinations ?? [],
  },

  volunteer: {
    basicTokens: (volunteer) => [
      toSearchToken(volunteer?.firstName),
      toSearchToken(volunteer?.patronymic),
      toSearchToken(volunteer?.lastName),
      toSearchToken(volunteer?.comment),
      volunteer?.isRestricted ? 'заблокирован с blocked from' : '',
      ...dateVariants(volunteer?.dateOfRestriction),
      toSearchToken(volunteer?.causeOfRestriction),
      ...dateVariants(volunteer?.dateOfStart),
      ...dateVariants(volunteer?.orders?.[0]?.createdAt ?? null),
    ],
    contacts: (volunteer) => volunteer?.contacts ?? [],
    addresses: (volunteer) => volunteer?.addresses ?? [],
    institutes: (volunteer) =>
      volunteer?.institutes ?? [],

    subscriptions: (volunteer) =>
      volunteer?.subscriptions ?? [],

    cooperations: (volunteer) =>
      volunteer?.cooperations ?? [],
    firstNonRestrictedAddress: (volunteer) =>
      (volunteer?.addresses ?? []).find((address) => !address?.isRestricted),
    pushAddressTokens: (tokens, address) => pushAddressTokens(tokens, address),
    outdatedNames: (volunteer) =>
      (volunteer?.outdatedNames ?? [])
        .flatMap((outdatedName) => [
          outdatedName.firstName,
          outdatedName.patronymic,
          outdatedName.lastName])
        .filter(Boolean)
        .join(' '),
  },

  home: {
    basicTokens: (home) => [
      toSearchToken(home?.homeName),
      toSearchToken(home?.officialName),

      home?.noAddress
        ? 'БОА no return address'
        : '',

      home?.specialHome
        ? 'специальный интернат special home'
        : '',

      home?.acceptableForSchool
        ? 'можно давать школам acceptable for school'
        : '',

      ...dateVariants(home?.dateOfClose),

      home?.isClose
        ? 'закрыт close'
        : '',

      toSearchToken(home?.comment),
      toSearchToken(home?.infoNote),

      ...dateVariants(
        home?.updateDates?.[0],
      ),

      home?.isRestricted
        ? 'не участвует с inactive from'
        : '',

      ...dateVariants(home?.dateOfRestriction),

      toSearchToken(home?.causeOfRestriction),

      ...dateVariants(home?.dateOfStart),
    ],

    contacts: (home) =>
      home?.contacts ?? [],

    addresses: (home) =>
      home?.addresses ?? [],

    coordinations: (home) =>
      home?.coordinations ?? [],

    firstNonRestrictedAddress: (home) =>
      (home?.addresses ?? [])
        .find(
          (address) => !address?.isRestricted,
        ),

    pushAddressTokens: (tokens, address) =>
      pushAddressTokens(tokens, address),

    outdatedNames: (home) =>
      (home?.outdatedNames ?? [])
        .flatMap(
          (outdatedName) => [
            outdatedName.officialName,
          ],
        )
        .filter(Boolean)
        .join(' '),
  },

  senior: {
    basicTokens: (senior) => [
      toSearchToken(senior?.firstName),
      toSearchToken(senior?.patronymic),
      toSearchToken(senior?.lastName),

      toSearchToken(senior?.comment),

      senior?.isRestricted
        ? 'заблокирован с blocked from'
        : '',

      ...dateVariants(senior?.dateOfRestriction),

      toSearchToken(senior?.causeOfRestriction),

      ...dateVariants(senior?.dateOfStart),

      ...dateVariants(senior?.birthDate),
      ...dateVariants(senior?.dateOfConsent),
      ...dateVariants(senior?.dateOfExit),

      senior?.gender === 'male'
        ? 'male муж.'
        : 'female жен.',

      toSearchToken(senior?.infoNote),
      toSearchToken(senior?.photoLink),

      senior?.personalNoAddr
        ? 'БОА no return address'
        : '',

      toSearchToken(senior?.kindergarten),
      toSearchToken(senior?.teacher),
      toSearchToken(senior?.veteran),
      toSearchToken(senior?.childOfWar),
      toSearchToken(senior?.profession),
      toSearchToken(senior?.honoraryStatus),
      toSearchToken(senior?.interests),

      toSearchToken(
        senior?.home?.homeName,
      ),

      senior?.spouse
        ? [
          fullName(senior.spouse),
          ...dateVariants(
            senior.spouse?.birthDate,
          ),
        ].join(' ')
        : '',
    ],

    outdatedNames: (senior) =>
      (senior?.outdatedNames ?? [])
        .flatMap(
          (outdatedName) => [
            outdatedName.firstName,
            outdatedName.patronymic,
            outdatedName.lastName,
          ],
        )
        .filter(Boolean)
        .join(' '),

    firstNonRestrictedAddress: (senior) =>
      (senior?.home?.addresses ?? [])
        .find(
          (address) => !address?.isRestricted,
        ),

    pushAddressTokens: (tokens, address) =>
      pushAddressTokens(tokens, address),

    contacts: () => [],

    addresses: () => [],
  },
};

// ---------- Public API ----------

/** Actual Search String */
export function createSearchStringFor(kind, record) {
  const config = OWNER_CONFIG[kind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);

  const tokens = [];
  tokens.push(...config.basicTokens(record));

  // contacts (only not restricted)
  for (const contact of config.contacts(record)) {
    if (!contact?.isRestricted && contact?.content) tokens.push(toSearchToken(contact.content));
  }

  // first non-restricted address
  const address = config.firstNonRestrictedAddress(record);
  config.pushAddressTokens(tokens, address);

  if (kind === 'volunteer') {
    for (const institute of config.institutes(record)) {
      if (!institute?.isRestricted) {
        tokens.push(toSearchToken(institute.instituteName));
        pushInstituteCategoryTokens(tokens, institute.category);
      }
    }
    if (config.subscriptions(record).length) {
      tokens.push('subscription подписка');
    }

    for (const subscription of config.subscriptions(record)) {
      tokens.push(
        toSearchToken(subscription.user.userName)
      );
    }
    for (const cooperation of config.cooperations(record)) {
      tokens.push(
        toSearchToken(cooperation.user.userName),
      );
    }
  }

  if (kind === 'partner') {
    for (const coordination of config.coordinations(record)) {
      if (!coordination?.isRestricted) {
        tokens.push(toSearchToken(coordination.homeName));
        tokens.push(toSearchToken(coordination.regionName));
      }
    }
  }

  if (kind === 'home') {
    for (const coordination of config.coordinations(record)) {
      if (!coordination?.isRestricted) {
        tokens.push(
          fullName(coordination.partner ?? {}),
        );

        for (
          const contact
          of coordination.partner?.contacts ?? []
        ) {
          if (
            !contact?.isRestricted &&
            contact?.content
          ) {
            tokens.push(
              toSearchToken(contact.content),
            );
          }
        }
      }
    }
  }

  return normalizeSpace(tokens.join(' '));
}

/** Outdated Search String */
export function createOutdatedSearchStringFor(kind, record) {
  const config = OWNER_CONFIG[kind];
  if (!config) throw new CustomError('ERRORS.UNSUPPORTED_TYPE', 500);

  const parts = [];

  // restricted contacts
  for (const contact of config.contacts(record)) {
    if (contact?.isRestricted && contact?.content) {
      parts.push(
        toSearchToken(contact.content),
      );
    }
  }

  // restricted addresses
  const restrictedAddresses =
    config.addresses(record)
      .filter(
        (address) => address?.isRestricted,
      );

  for (const address of restrictedAddresses) {
    config.pushAddressTokens(
      parts,
      address,
    );
  }

  // outdated names
  const outdatedNames = config.outdatedNames(record);
  if (outdatedNames) {
    parts.push(outdatedNames);
  }

  if (kind === 'volunteer') {
    for (const institute of config.institutes(record)) {
      if (institute?.isRestricted) {
        parts.push(toSearchToken(institute.instituteName));
        pushInstituteCategoryTokens(parts, institute.category);
      }
    }
  }

  if (kind === 'partner') {
    for (const coordination of config.coordinations(record)) {
      if (coordination?.isRestricted) {
        parts.push(toSearchToken(coordination.homeName));
        parts.push(toSearchToken(coordination.regionName));
      }
    }
  }

  if (kind === 'home') {
    for (const coordination of config.coordinations(record)) {
      if (coordination?.isRestricted) {
        parts.push(fullName(coordination.partner ?? {}));

        for (const contact of coordination.partner?.contacts ?? []) {
          if (!contact?.isRestricted && contact?.content) {
            parts.push(toSearchToken(contact.content));
          }
        }
      }
    }
  }

  return normalizeSpace(parts.join(' '));
}

export async function refreshVolunteerSearch(
  volunteerId,
  transaction,
) {
  const volunteer = await Volunteer.findByPk(
    volunteerId,
    {
      include: [
        {
          model: VolunteerContact,
          as: 'contacts',
          attributes: [
            'content',
            'isRestricted',
          ],
        },
        {
          model: VolunteerAddress,
          as: 'addresses',
          attributes: [
            'isRestricted',
            'fullPostalAddress',
          ],
          include: [
            {
              model: Country,
              attributes: ['name'],
            },
            {
              model: Region,
              attributes: ['name', 'shortName'],
            },
            {
              model: District,
              attributes: ['name', 'shortName'],
            },
            {
              model: Locality,
              attributes: ['name', 'shortName'],
            },
          ],
        },
        {
          model: VolunteerInstitute,
          as: 'institutes',
          attributes: [
            'instituteName',
            'category',
            'isRestricted',
          ],
        },
        {
          model: VolunteerSubscription,
          as: 'subscriptions',
          attributes: ['userId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userName'],
            },
          ],
        },
        {
          model: VolunteerCooperation,
          as: 'cooperations',
          attributes: ['userId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['userName'],
            },
          ],
        },
        {
          model: Order,
          as: 'orders',
          attributes: ['createdAt'],
          required: false,
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']],
        },
      ],
      transaction,
    },
  );

  if (!volunteer) return;

  const content = createSearchStringFor(
    'volunteer',
    volunteer,
  );

  await VolunteerSearch.update(
    { content },
    {
      where: {
        volunteerId,
        isRestricted: false,
      },
      transaction,
    },
  );
}
