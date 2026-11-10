import {
  Country,
  Region,
  District,
  Locality,
  HomeAddress,
  UserAddress,
  PartnerAddress,
  VolunteerAddress,
} from '../models/index.js';

import {
  Op,
  fn,
  col,
  where as sqlWhere,
} from 'sequelize';

import {
  correctCountryName,
  correctDistrictName,
  correctLocalityName,
  correctRegionName,
} from './correct-toponym-name.js';

import CustomError from '../shared/customError.js';

export const MAPS = {
  countries: 'country',
  regions: 'region',
  districts: 'district',
  localities: 'locality',
};

// Query metadata for each toponym type.
export const MAP = {
  country: {
    Model: Country,
    ChildModel: Region,

    payloadFields: [
      'name',
    ],

    attributes: [
      'id',
      'name',
    ],

    searchFields: [
      'name',
    ],

    detailsInclude: [],

    listInclude: () => [],

    where: (query) => ({
      isRestricted: false,

      ...(query.countries.length
        ? {
          id: {
            [Op.in]: query.countries,
          },
        }
        : null),
    }),

    order: (query) => [
      [
        'name',
        query.sortDir.toUpperCase(),
      ],
    ],
  },

  region: {
    Model: Region,
    ChildModel: District,

    payloadFields: [
      'name',
      'countryId',
      'shortName',
    ],

    parentIdField: 'countryId',

    duplicateScope: (query) => ({
      countryId: query.countryId,
    }),

    attributes: [
      'id',
      'name',
      'shortName',
    ],

    searchFields: [
      'name',
      'shortName',
      '$country.name$',
    ],

    detailsInclude: [
      {
        model: Country,
        as: 'country',
        attributes: ['id'],
      },
    ],

    listInclude: () => [
      {
        model: Country,
        as: 'country',
        attributes: [
          'id',
          'name',
        ],
        required: true,
      },
    ],

    where: (query) => ({
      isRestricted: false,

      ...(query.regions.length
        ? {
          id: {
            [Op.in]: query.regions,
          },
        }
        : null),

      ...(query.countries.length
        ? {
          countryId: {
            [Op.in]: query.countries,
          },
        }
        : null),
    }),

    order: (query) =>
      query.sortBy === 'country'
        ? [
          [
            {
              model: Country,
              as: 'country',
            },
            'name',
            query.sortDir.toUpperCase(),
          ],
        ]
        : [
          [
            query.sortBy,
            query.sortDir.toUpperCase(),
          ],
        ],
  },

  district: {
    Model: District,
    ChildModel: Locality,

    payloadFields: [
      'name',
      'regionId',
      'shortName',
      'postName',
      'shortPostName',
    ],

    parentIdField: 'regionId',

    duplicateScope: (query) => ({
      regionId: query.regionId,
    }),

    attributes: [
      'id',
      'name',
      'shortName',
      'postName',
      'shortPostName',
    ],

    searchFields: [
      'name',
      'shortName',
      '$region.name$',
      '$region.shortName$',
      '$region.country.name$',
    ],

    detailsInclude: [
      {
        model: Region,
        as: 'region',
        attributes: ['id'],

        include: [
          {
            model: Country,
            as: 'country',
            attributes: ['id'],
          },
        ],
      },
    ],

    listInclude: (query) => [
      {
        model: Region,
        as: 'region',
        attributes: [
          'id',
          'name',
        ],
        required: true,

        include: [
          {
            model: Country,
            as: 'country',
            attributes: [
              'id',
              'name',
            ],
            required: true,

            where: query.countries.length
              ? {
                id: {
                  [Op.in]: query.countries,
                },
              }
              : undefined,
          },
        ],
      },
    ],

    where: (query) => ({
      isRestricted: false,

      ...(query.districts.length
        ? {
          id: {
            [Op.in]: query.districts,
          },
        }
        : null),

      ...(query.regions.length
        ? {
          regionId: {
            [Op.in]: query.regions,
          },
        }
        : null),
    }),

    order: (query) => {
      const direction =
        query.sortDir.toUpperCase();

      if (query.sortBy === 'region') {
        return [
          [
            {
              model: Region,
              as: 'region',
            },
            'name',
            direction,
          ],
        ];
      }

      if (query.sortBy === 'country') {
        return [
          [
            {
              model: Region,
              as: 'region',
            },
            {
              model: Country,
              as: 'country',
            },
            'name',
            direction,
          ],
        ];
      }

      return [
        [
          query.sortBy,
          direction,
        ],
      ]; // name | shortName/postName
    },
  },

  locality: {
    Model: Locality,

    payloadFields: [
      'name',
      'districtId',
      'shortName',
      'isFederalCity',
      'isCapitalOfRegion',
      'isCapitalOfDistrict',
    ],

    parentIdField: 'districtId',

    duplicateScope: (query) => ({
      districtId: query.districtId,
    }),

    attributes: [
      'id',
      'name',
      'shortName',
      'isFederalCity',
      'isCapitalOfRegion',
      'isCapitalOfDistrict',
    ],

    searchFields: [
      'name',
      'shortName',
      '$district.name$',
      '$district.shortName$',
      '$district.region.name$',
      '$district.region.shortName$',
      '$district.region.country.name$',
    ],

    detailsInclude: [
      {
        model: District,
        as: 'district',
        attributes: ['id'],

        include: [
          {
            model: Region,
            as: 'region',
            attributes: ['id'],

            include: [
              {
                model: Country,
                as: 'country',
                attributes: ['id'],
              },
            ],
          },
        ],
      },
    ],

    listInclude: (query) => [
      {
        model: District,
        as: 'district',
        attributes: [
          'id',
          'name',
        ],
        required: true,

        include: [
          {
            model: Region,
            as: 'region',
            attributes: [
              'id',
              'name',
            ],
            required: true,

            where: query.regions.length
              ? {
                id: {
                  [Op.in]: query.regions,
                },
              }
              : undefined,

            include: [
              {
                model: Country,
                as: 'country',
                attributes: [
                  'id',
                  'name',
                ],
                required: true,

                where: query.countries.length
                  ? {
                    id: {
                      [Op.in]: query.countries,
                    },
                  }
                  : undefined,
              },
            ],
          },
        ],
      },
    ],

    where: (query) => ({
      isRestricted: false,

      ...(query.localities.length
        ? {
          id: {
            [Op.in]: query.localities,
          },
        }
        : null),

      ...(query.districts.length
        ? {
          districtId: {
            [Op.in]: query.districts,
          },
        }
        : null),
    }),

    order: (query) => {
      const direction =
        query.sortDir.toUpperCase();

      if (query.sortBy === 'district') {
        return [
          [
            {
              model: District,
              as: 'district',
            },
            'name',
            direction,
          ],
        ];
      }

      if (query.sortBy === 'region') {
        return [
          [
            {
              model: District,
              as: 'district',
            },
            {
              model: Region,
              as: 'region',
            },
            'name',
            direction,
          ],
        ];
      }

      if (query.sortBy === 'country') {
        return [
          [
            {
              model: District,
              as: 'district',
            },
            {
              model: Region,
              as: 'region',
            },
            {
              model: Country,
              as: 'country',
            },
            'name',
            direction,
          ],
        ];
      }

      return [
        [
          query.sortBy,
          direction,
        ],
      ];
    },
  },
};

const ADDRESS_MODELS = [
  UserAddress,
  HomeAddress,
  PartnerAddress,
  VolunteerAddress,
];

// Paths used to pull parent ids from raw toponym rows.
const ID_WAYS = {
  locality: {
    locality: 'id',
    district: 'district.id',
    region: 'district.region.id',
    country: 'district.region.country.id',
  },

  district: {
    locality: null,
    district: 'id',
    region: 'region.id',
    country: 'region.country.id',
  },

  region: {
    locality: null,
    district: null,
    region: 'id',
    country: 'country.id',
  },

  country: {
    locality: null,
    district: null,
    region: null,
    country: 'id',
  },
};

// Paths used to pull parent names from raw toponym rows.
const NAME_WAYS = {
  locality: {
    district: 'district.name',
    region: 'district.region.name',
    country: 'district.region.country.name',
  },

  district: {
    region: 'region.name',
    country: 'region.country.name',
  },

  region: {
    country: 'country.name',
  },

  country: {},
};

export async function findDuplicate(query) {
  try {
    const config = MAP[query.type];

    if (
      config.parentIdField &&
      query[config.parentIdField] == null
    ) {
      throw new CustomError(
        'ERRORS.VALIDATION',
        422,
      );
    }

    const where = {
      name: {
        [Op.iLike]: query.name,
      },

      //isRestricted: false,

      ...(config.duplicateScope
        ? config.duplicateScope(query)
        : {}),

      ...(query.id
        ? {
          id: {
            [Op.ne]: query.id,
          },
        }
        : {}),
    };

    return config.Model.count({
      where,
    });
  } catch (error) {
    error.code =
      error.code ?? null;

    error.message =
      `Error in findDuplicate (${query.name}, ${query.type}): ${error.message ?? ''}`;

    throw error;
  }
}

export async function countToponymDependencies(
  query,
  config,
  transaction,
) {
  const foreignKey =
    `${query.type}Id`;

  const where = query.destroy
    ? {
      [foreignKey]: query.id,
    }
    : {
      isRestricted: false,
      [foreignKey]: query.id,
    };

  const addressCounts = await Promise.all(
    ADDRESS_MODELS.map((AddressModel) =>
      AddressModel.count({
        where,
        transaction,
      }),
    ),
  );

  const childrenCount = config.ChildModel
    ? await config.ChildModel.count({
      where,
      transaction,
    })
    : 0;

  const addressesCount =
    addressCounts.reduce(
      (total, count) =>
        total + count,
      0,
    );

  return (
    addressesCount +
    childrenCount
  );
}

export function postProcessor(
  toponym,
  type,
) {
  toponym =
    addDefaultAddressParams(
      toponym,
      type,
    );

  toponym =
    addParentsNames(
      toponym,
      type,
    );

  return toponym;
}

export async function getToponymById(
  id,
  type,
) {
  const config = MAP[type];

  const toponym =
    await config.Model.findOne({
      where: {
        id,
        isRestricted: false,
      },

      attributes:
        config.attributes,

      include:
        config.detailsInclude,

      raw: true,
    });

  if (!toponym) {
    throw new CustomError(
      'ERRORS.DATA_NOT_FOUND',
      404,
    );
  }

  return addDefaultAddressParams(
    toponym,
    type,
  );
}

export function addDefaultAddressParams(
  toponym,
  type,
) {
  const idPaths =
    ID_WAYS[type];

  const getId = (key) => {
    const path = idPaths[key];

    if (!path) return null;

    const id = toponym[path];

    // Remove nested copies so the caller only sees normalized ids.
    if (path !== 'id') {
      delete toponym[path];
    }

    return id;
  };

  toponym.defaultAddressParams = {
    countryId:
      getId('country'),

    regionId:
      getId('region'),

    districtId:
      getId('district'),

    localityId:
      getId('locality'),
  };

  return toponym;
}

export function addParentsNames(
  toponym,
  type,
) {
  const namePaths =
    NAME_WAYS[type];

  const getName = (key) => {
    const path =
      namePaths[key];

    if (!path) return null;

    const name =
      toponym[path];

    // Strip raw columns now that they are exposed under friendly keys.
    delete toponym[path];

    return name;
  };

  if (type !== 'country') {
    toponym.countryName =
      getName('country');

    if (type !== 'region') {
      toponym.regionName =
        getName('region');

      if (type !== 'district') {
        toponym.districtName =
          getName('district');
      }
    }
  }

  return toponym;
}

export const norm = (value) =>
  (
    value.normalize
      ? value.normalize('NFC')
      : value
  )
    .trim()
    .toLowerCase();

// Returns a list of parent names that could not be resolved for the given rows.
const checkMissingParents = (
  list,
  parents,
  parentType,
) => {
  const missingParents =
    new Set();

  list.forEach((toponym) => {
    const parentMap =
      parents[
      `${parentType}ByLowerName`
      ];

    const parent =
      parentMap.get(
        norm(
          toponym[parentType],
        ),
      );

    if (!parent) {
      missingParents.add(
        toponym[parentType],
      );
    }
  });

  return [
    ...missingParents,
  ];
};

// Bulk import helpers keyed by toponym type.
async function findNameConflicts(
  Model,
  rows,
) {
  const names = [
    ...new Set(
      rows.map((row) =>
        norm(row.name),
      ),
    ),
  ];

  const existingToponyms =
    await Model.findAll({
      attributes: ['name'],

      where: sqlWhere(
        fn('lower', col('name')),
        {
          [Op.in]: names,
        },
      ),

      raw: true,
    });

  return existingToponyms.map(
    (toponym) => toponym.name,
  );
}

export const MAP_POPULATE = {
  country: {
    Model: Country,

    preprocessRow: (row) => {
      const correctedCountry =
        correctCountryName(
          row.name,
        );

      return {
        ...row,
        name:
          correctedCountry.name,
      };
    },

    keyFromRow: (row) =>
      norm(row.name),

    resolveParents: async () =>
      ({}),

    findMissingParents: () =>
      [],

    findConflicts: (rows) =>
      findNameConflicts(
        Country,
        rows,
      ),

    buildPayload: (row) => ({
      name: row.name,
    }),
  },

  region: {
    Model: Region,

    preprocessRow: (row) => {
      const correctedRegion =
        correctRegionName(
          row.name,
          row.shortName,
        );

      return {
        ...row,

        name:
          correctedRegion.name,

        shortName:
          correctedRegion.shortName,
      };
    },

    keyFromRow: (row) =>
      norm(row.name),

    resolveParents: async (rows) => {
      const wantedCountryNames = [
        ...new Set(
          rows.map((row) =>
            norm(row.country),
          ),
        ),
      ];

      const countries =
        await Country.findAll({
          attributes: [
            'id',
            'name',
          ],

          where: sqlWhere(
            fn(
              'lower',
              col('name'),
            ),
            {
              [Op.in]:
                wantedCountryNames,
            },
          ),

          raw: true,
        });

      const countryByLowerName =
        new Map(
          countries.map(
            (country) => [
              norm(country.name),
              country,
            ],
          ),
        );

      return {
        countryByLowerName,
      };
    },

    findMissingParents: (
      rows,
      parents,
    ) =>
      checkMissingParents(
        rows,
        parents,
        'country',
      ),

    findConflicts: (rows) =>
      findNameConflicts(
        Region,
        rows,
      ),

    buildPayload: (
      row,
      parents,
    ) => {
      const country =
        parents.countryByLowerName.get(
          norm(row.country),
        );

      return {
        name: row.name,
        shortName: row.shortName,
        countryId: country.id,
      };
    },
  },

  district: {
    Model: District,

    preprocessRow: (row) => {
      const correctedDistrict =
        correctDistrictName(
          row.name,
          row.postName,
          row.postNameType,
        );

      return {
        ...row,

        name:
          correctedDistrict.name,

        shortName:
          correctedDistrict.shortName,

        postName:
          correctedDistrict.postName,

        shortPostName:
          correctedDistrict.shortPostName,
      };
    },

    keyFromRow: (row) =>
      `${norm(row.region)}|${norm(row.name)}`,

    resolveParents: async (rows) => {
      const wantedRegionNames = [
        ...new Set(
          rows.map((row) =>
            norm(row.region),
          ),
        ),
      ];

      const regions =
        await Region.findAll({
          attributes: [
            'id',
            'name',
          ],

          where: sqlWhere(
            fn(
              'lower',
              col('name'),
            ),
            {
              [Op.in]:
                wantedRegionNames,
            },
          ),

          raw: true,
        });

      const regionByLowerName =
        new Map(
          regions.map(
            (region) => [
              norm(region.name),
              region,
            ],
          ),
        );

      return {
        regionByLowerName,
      };
    },

    findMissingParents: (
      rows,
      parents,
    ) =>
      checkMissingParents(
        rows,
        parents,
        'region',
      ),

    findConflicts: async (
      rows,
      parents,
    ) => {
      // Group districts by region so we can query once per region.
      const districtNamesByRegion =
        new Map();

      for (const row of rows) {
        const region =
          parents.regionByLowerName.get(
            norm(row.region),
          );

        const districtNames =
          districtNamesByRegion.get(
            region.id,
          ) ?? new Set();

        districtNames.add(
          norm(row.name),
        );

        districtNamesByRegion.set(
          region.id,
          districtNames,
        );
      }

      const conflicts = [];

      for (
        const [
          regionId,
          districtNames,
        ]
        of districtNamesByRegion
      ) {
        const existingDistricts =
          await District.findAll({
            attributes: [
              'name',
            ],

            where: {
              regionId,

              [Op.and]: [
                sqlWhere(
                  fn(
                    'lower',
                    col(
                      'district.name',
                    ),
                  ),
                  {
                    [Op.in]: [
                      ...districtNames,
                    ],
                  },
                ),
              ],
            },

            include: [
              {
                model: Region,
                attributes: [
                  'name',
                ],
              },
            ],

            raw: true,
          });

        conflicts.push(
          ...existingDistricts.map(
            (district) =>
              `${district.name} (${district['region.name']})`,
          ),
        );
      }

      return conflicts;
    },

    buildPayload: (
      row,
      parents,
    ) => {
      const region =
        parents.regionByLowerName.get(
          norm(row.region),
        );

      return {
        name: row.name,
        shortName: row.shortName,
        postName: row.postName,
        shortPostName:
          row.shortPostName,
        regionId: region.id,
      };
    },
  },

  locality: {
    Model: Locality,

    preprocessRow: (row) => {
      const correctedLocality =
        correctLocalityName(
          row.name,
          row.type,
          row.district,
        );

      return {
        ...row,

        name:
          correctedLocality.name,

        shortName:
          correctedLocality.shortName,

        districtFullName:
          correctedLocality.districtFullName,
      };
    },

    keyFromRow: (row) =>
      `${norm(row.name)}|${norm(row.districtFullName)}|${norm(row.region)}`,

    resolveParents: async (rows) => {
      const wantedRegionNames = [
        ...new Set(
          rows.map((row) =>
            norm(row.region),
          ),
        ),
      ];

      const regions =
        await Region.findAll({
          attributes: [
            'id',
            'name',
          ],

          where: sqlWhere(
            fn(
              'lower',
              col('name'),
            ),
            {
              [Op.in]:
                wantedRegionNames,
            },
          ),

          raw: true,
        });

      const regionByLowerName =
        new Map(
          regions.map(
            (region) => [
              norm(region.name),
              region,
            ],
          ),
        );

      const districtNamesByRegion =
        new Map();

      for (const row of rows) {
        const region =
          regionByLowerName.get(
            norm(row.region),
          );

        if (!region) {
          throw new CustomError(
            'ERRORS.TOPONYM.BULK_PARENT_NOT_FOUND',
            422,
            {
              parents:
                row.region,
            },
          );
        }

        const districtNames =
          districtNamesByRegion.get(
            region.id,
          ) ?? new Set();

        districtNames.add(
          norm(
            row.districtFullName,
          ),
        );

        districtNamesByRegion.set(
          region.id,
          districtNames,
        );
      }

      const districts = [];

      for (
        const [
          regionId,
          districtNamesSet,
        ]
        of districtNamesByRegion.entries()
      ) {
        const districtNames = [
          ...districtNamesSet,
        ];

        if (
          districtNames.length === 0
        ) {
          continue;
        }

        const foundDistricts =
          await District.findAll({
            attributes: [
              'id',
              'name',
              'regionId',
            ],

            where: {
              regionId,

              [Op.and]: [
                sqlWhere(
                  fn(
                    'lower',
                    col('name'),
                  ),
                  {
                    [Op.in]:
                      districtNames,
                  },
                ),
              ],
            },

            raw: true,
          });

        districts.push(
          ...foundDistricts,
        );
      }

      const getDistrictKey = (
        regionId,
        districtName,
      ) =>
        `${regionId}|${norm(districtName)}`;

      const districtByKey =
        new Map();

      for (
        const district
        of districts
      ) {
        districtByKey.set(
          getDistrictKey(
            district.regionId,
            district.name,
          ),
          district,
        );
      }

      return {
        regionByLowerName,
        districtByKey,
      };
    },

    findMissingParents: (
      rows,
      parents,
    ) => {
      const missingParents =
        new Set();

      for (const row of rows) {
        const region =
          parents.regionByLowerName.get(
            norm(row.region),
          );

        const district =
          parents.districtByKey.get(
            `${region.id}|${norm(row.districtFullName)}`,
          );

        if (!district) {
          missingParents.add(
            `${row.districtFullName} (${row.region})`,
          );
        }
      }

      return [
        ...missingParents,
      ];
    },

    findConflicts: async (
      rows,
      parents,
    ) => {
      // Group localities by district so we can query once per district.
      const localityNamesByDistrict =
        new Map();

      for (const row of rows) {
        const region =
          parents.regionByLowerName.get(
            norm(row.region),
          );

        const district =
          parents.districtByKey.get(
            `${region.id}|${norm(row.districtFullName)}`,
          );

        const localityNames =
          localityNamesByDistrict.get(
            district.id,
          ) ?? new Set();

        localityNames.add(
          norm(row.name),
        );

        localityNamesByDistrict.set(
          district.id,
          localityNames,
        );
      }

      const conflicts = [];

      for (
        const [
          districtId,
          localityNames,
        ]
        of localityNamesByDistrict
      ) {
        const existingLocalities =
          await Locality.findAll({
            attributes: [
              'name',
            ],

            where: {
              districtId,

              [Op.and]: [
                sqlWhere(
                  fn(
                    'lower',
                    col(
                      'locality.name',
                    ),
                  ),
                  {
                    [Op.in]: [
                      ...localityNames,
                    ],
                  },
                ),
              ],
            },

            include: [
              {
                model: District,
                attributes: [
                  'name',
                ],

                include: [
                  {
                    model: Region,
                    attributes: [
                      'name',
                    ],
                  },
                ],
              },
            ],

            raw: true,
          });

        conflicts.push(
          ...existingLocalities.map(
            (locality) =>
              `${locality.name} (${locality['district.name']}, ${locality['district.region.name']})`,
          ),
        );
      }

      return conflicts;
    },

    buildPayload: (
      row,
      parents,
    ) => {
      const region =
        parents.regionByLowerName.get(
          norm(row.region),
        );

      const district =
        parents.districtByKey.get(
          `${region.id}|${norm(row.districtFullName)}`,
        );

      return {
        name:
          row.name,

        shortName:
          row.shortName,

        isCapitalOfRegion:
          row.isCapitalOfRegion,

        isCapitalOfDistrict:
          row.isCapitalOfDistrict,

        isFederalCity:
          row.isFederalCity,

        districtId:
          district.id,
      };
    },
  },
};

/** After a toponym is blocked, freeze all restricted addresses that reference it */
export async function markAddressesUnrecoverable(
  type,
  toponymId,
  transaction,
) {
  const foreignKeyByType = {
    country: 'countryId',
    region: 'regionId',
    district: 'districtId',
    locality: 'localityId',
  };

  const foreignKey =
    foreignKeyByType[type];

  if (!foreignKey) return;

  await Promise.all(
    ADDRESS_MODELS.map(
      (AddressModel) =>
        AddressModel.update(
          {
            isRecoverable: false,
          },
          {
            where: {
              isRestricted: true,
              [foreignKey]:
                toponymId,
            },
            individualHooks: true,
            transaction,
          },
        ),
    ),
  );
}
