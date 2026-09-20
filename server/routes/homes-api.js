import { Router } from 'express';
import { Op, Sequelize } from 'sequelize';
import {
  Country,
  Region,
  District,
  Locality,
  Home,
  HomeAddress,
  HomeContact,
  HomeCoordination,
  HomeOutdatedName,
  HomeSearch,
  HomeUpdateDate,
  Partner,
  PartnerContact,
  Senior,
} from '../models/index.js';
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from '../middlewares/validate-request.js';
import CustomError from '../shared/customError.js';
import * as homeSchemas from '../../shared/dist/schemas/home.schema.js';
import { withTransaction } from '../controllers/with-transaction.js';
import {
  saveOwnerContactsAndAddress,
} from '../controllers/ctrl-create-owner-contacts-address.js';
import {
  createSearchStringFor,
  createOutdatedSearchStringFor,
} from '../controllers/ctrl-search-string.js';
import {
  betweenDatesInclusive,
  buildAddressOwnerIdSubquery,
  buildContactOwnerIdSubquery,
  buildOrderFor,
  buildSearchContentWhere,
} from '../controllers/ctrl-owner-query-builders.js';
import {
  setHomeStatusValue,
  transformOwnerData,
} from '../controllers/ctrl-transform-owner.js';
import { applyOwnerUpdates } from '../controllers/ctrl-apply-owner-updates.js';
import { syncRecipientsAfterHomeUpdate } from '../controllers/ctrl-sync-recipients.js';

const router = Router();

const HOME_DETAILS_INCLUDE = [
  {
    model: HomeContact,
    as: 'contacts',
    attributes: ['id', 'type', 'content', 'isRestricted'],
  },
  {
    model: HomeAddress,
    as: 'addresses',
    attributes: [
      'id',
      'isRestricted',
      'isRecoverable',
      'postalName',
      'postalCode',
      'postalAddressPart',
      'fullPostalAddress',
    ],
    include: [
      {
        model: Country,
        attributes: ['id', 'name'],
      },
      {
        model: Region,
        attributes: ['id', 'shortName'],
      },
      {
        model: District,
        attributes: ['id', 'shortName'],
      },
      {
        model: Locality,
        attributes: ['id', 'shortName'],
      },
    ],
  },
  {
    model: HomeOutdatedName,
    as: 'outdatedNames',
    attributes: ['id', 'officialName'],
  },
  {
    model: HomeCoordination,
    as: 'coordinations',
    attributes: ['id', 'partnerId', 'homeId', 'isRecoverable', 'isRestricted'],
    include: [
      {
        model: Partner,
        as: 'partner',
        attributes: ['firstName', 'patronymic', 'lastName'],
        include: [
          {
            model: PartnerContact,
            as: 'contacts',
            where: { isRestricted: false },
            attributes: ['id', 'type', 'content', 'isRestricted'],
            required: false,
          },
        ],
      },
    ],
  },
  {
    model: HomeUpdateDate,
    as: 'updateDates',
    attributes: ['date'],
    where: { isLatest: true },
    required: false,
  },
];

async function refreshHomeSearch(homeId, transaction) {
  const home = await Home.findByPk(homeId, {
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: HOME_DETAILS_INCLUDE,
    transaction,
  });

  if (!home) return;

  const content = createSearchStringFor(
    'home',
    home,
  );

  await HomeSearch.update(
    { content },
    {
      where: {
        homeId,
        isRestricted: false,
      },
      individualHooks: true,
      transaction,
    },
  );
}

router.get(
  '/check-home-name',
  requireAuth,
  requireAny('ADD_NEW_HOME', 'EDIT_HOME'),
  validateRequest(homeSchemas.checkHomeNameSchema, 'query'),
  async (req, res, next) => {
    try {
      const { homeName, id } = req.query;
      const where = {
        homeName: { [Op.iLike]: homeName.toLowerCase() },
        ...(id ? { id: { [Op.ne]: id } } : {}),
      };

      const duplicateCount = await Home.count({
        where,
      });

      const response = {
        data: duplicateCount !== 0,
        ...(duplicateCount ? { code: 'ERRORS.HOME.ALREADY_EXISTS' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.post(
  '/create-home',
  requireAuth,
  requireOperation('ADD_NEW_HOME'),
  validateRequest(homeSchemas.homeDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingHome = req.body;
      const result = await withTransaction(async (transaction) => {

        const home = await Home.create(
          {
            homeName: creatingHome.homeName,
            officialName: creatingHome.officialName,
            noAddress: creatingHome.noAddress,
            specialHome: creatingHome.specialHome,
            acceptableForSchool: creatingHome.acceptableForSchool,
            comment: creatingHome.comment,
            infoNote: creatingHome.infoNote,
            isRestricted: creatingHome.isRestricted,
            causeOfRestriction: creatingHome.causeOfRestriction,
            dateOfRestriction: creatingHome.dateOfRestriction,
            isClose: creatingHome.isClose,
            dateOfClose: creatingHome.dateOfClose,
          },
          { transaction },
        );

        await saveOwnerContactsAndAddress(
          'home',
          home,
          creatingHome,
          { HomeContact, HomeAddress },
          transaction,
        );

        if ((creatingHome.draftCoordinations ?? []).length) {
          await HomeCoordination.bulkCreate(
            creatingHome.draftCoordinations.map((id) => ({
              homeId: home.id,
              partnerId: id,
              isRestricted: creatingHome.isClose,
              isRecoverable: !creatingHome.isClose,
            })),
            {
              transaction,
              individualHooks: true,
            },
          );
        }

        const freshHome = await Home.findOne({
          where: { id: home.id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: HOME_DETAILS_INCLUDE,
          transaction,
        });

        const searchString = createSearchStringFor('home', freshHome);
        await HomeSearch.create(
          { homeId: home.id, content: searchString },
          { transaction },
        );

        return home.homeName;
      });

      res.status(201).send({ code: 'SUCCESS.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      next(error);
    }
  },
);

router.post(
  '/update-home',
  requireAuth,
  requireOperation('EDIT_HOME'),
  validateRequest(homeSchemas.updateHomeDataSchema, 'body'),
  async (req, res, next) => {
    const {
      id,
      changingData,
      restoringData,
      outdatingData,
      deletingData,
    } = req.body;

    try {
      const result = await withTransaction(async (transaction) => {
        const home = await Home.findByPk(id, { transaction });
        if (!home) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        // Update main home data
        if (changingData?.main) {
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Home.update(payload, {
              where: { id },
              transaction,
              individualHooks: true,
            });
          }
        }

        // Apply related data changes
        await applyOwnerUpdates(
          'home',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          transaction,
        );

        // Update coordination availability when the home is closed or reopened
        if (changingData?.main?.isClose === true) {
          await HomeCoordination.update(
            { isRestricted: true, isRecoverable: false },
            {
              where: { homeId: id },
              individualHooks: true,
              transaction,
            },
          );
        }
        if (changingData?.main?.isClose === false) {
          const coordinations = await HomeCoordination.findAll({
            where: { homeId: id },
            include: [
              {
                model: Partner,
                as: 'partner',
                where: { isRestricted: false },
                attributes: [],
                required: true,
              },
            ],
            attributes: ['id'],
            transaction,
          });

          const coordinationIds = coordinations.map(
            (coordination) => coordination.id,
          );

          if (coordinationIds.length > 0) {
            await HomeCoordination.update(
              { isRecoverable: true },
              {
                where: { id: coordinationIds },
                individualHooks: true,
                transaction,
              },
            );
          }
        }

        // Reload home with related data
        const fresh = await Home.findOne({
          where: { id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: HOME_DETAILS_INCLUDE,
          transaction,
        });

        // Refresh search strings
        const search = createSearchStringFor('home', fresh);
        await HomeSearch.update(
          { content: search },
          {
            where: { homeId: id, isRestricted: false },
            individualHooks: true,
            transaction,
          },
        );
        const outdatedSearch = createOutdatedSearchStringFor('home', fresh);
        if (outdatedSearch) {
          const [row, created] = await HomeSearch.findOrCreate({
            where: { homeId: id, isRestricted: true },
            defaults: { content: outdatedSearch },
            transaction,
          });
          if (!created) {
            await row.update(
              { content: outdatedSearch },
              { individualHooks: true, transaction },
            );
          }
        } else {
          await HomeSearch.destroy({
            where: {
              homeId: id,
              isRestricted: true,
            },
            transaction,
          });
        }
        await syncRecipientsAfterHomeUpdate(
          id,
          changingData?.main ?? {},
          transaction,
        );
        return transformOwnerData('home', fresh.toJSON());
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

router.post(
  '/get-homes',
  requireAuth,
  requireAny('VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'),
  validateRequest(homeSchemas.homesQueryDTOSchema, 'body'),
  async (req, res, next) => {
    try {
      const {
        page: { size: pageSize, number: pageNumber },
        sort,
        search,
        view,
        filters,
      } = req.body;

      const includeOutdated = !!view?.includeOutdated;
      const order = buildOrderFor('home', sort);

      // Base filters
      const whereHome = {};
      const whereAddress = {};
      const whereContact = {};
      const whereCoordination = !includeOutdated ? { isRestricted: false } : {};
      const whereUpdateDate = { isLatest: true };

      switch (view?.option) {
        case 'only-active':
          whereHome.isRestricted = false;
          whereHome.isClose = false;
          break;
        case 'only-blocked':
          whereHome.isRestricted = true;
          whereHome.isClose = false;
          break;
        case 'only-closed':
          whereHome.isClose = true;
          break;
        case 'exclude-closed':
          whereHome.isClose = false;
          break;
        default:
          break;
      }

      // General filters
      if (typeof filters?.general?.noAddress === 'boolean') {
        whereHome.noAddress = filters.general.noAddress;
      }
      if (typeof filters?.general?.specialHome === 'boolean') {
        whereHome.specialHome = filters.general.specialHome;
      }
      if (typeof filters?.general?.acceptableForSchool === 'boolean') {
        whereHome.acceptableForSchool = filters.general.acceptableForSchool;
      }
      if (filters?.general?.dateBeginningRange) {
        whereHome.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereHome.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }
      if (filters?.general?.dateCloseRange) {
        whereHome.dateOfClose = betweenDatesInclusive(filters.general.dateCloseRange);
      }

      // Coordination filters
      const buildPartnerLiteral = (partnerList, includeOutdated) => {
        const restrictedClause = includeOutdated
          ? ''
          : 'AND c."isRestricted" = false';

        return Sequelize.literal(`
          EXISTS (
            SELECT 1
              FROM "home-coordinations" c
              WHERE c."homeId" = "home"."id"
              AND c."partnerId" IN (${partnerList})
              ${restrictedClause}
          )
        `);
      };

      const buildCoordinationLiteral = (has, includeOutdated) => {
        const existsKeyword = has ? 'EXISTS' : 'NOT EXISTS';
        const restrictedClause = includeOutdated
          ? ''
          : 'AND c."isRestricted" = false';

        return Sequelize.literal(`
          ${existsKeyword} (
            SELECT 1
            FROM "home-coordinations" c
            WHERE c."homeId" = "home"."id"
            ${restrictedClause}
          )
        `);
      };

      const hasCoordinationValue = filters?.general?.hasCoordination;
      const coordinationCondition =
        hasCoordinationValue !== undefined && hasCoordinationValue !== null;

      const hasCoordination = coordinationCondition
        ? buildCoordinationLiteral(!!hasCoordinationValue, !!includeOutdated)
        : undefined;

      const details = filters?.general?.details ?? [];
      if (details.length > 0) {
        const strict = !!filters?.mode?.strictDetail;
        const op = strict ? Op.and : Op.or;

        whereHome[op] = [
          ...details.map((detail) => ({ [detail]: { [Op.not]: null } })),
          ...(hasCoordination ? [hasCoordination] : []),
        ];
      } else if (hasCoordination) {
        whereHome[Op.and] = [hasCoordination];
      }

      const partners = filters?.general?.partners || [];
      const partnerRequired = partners.length > 0;
      if (partnerRequired) {
        const partnerList = partners.map(Number).join(',');

        whereHome[Op.and] = [
          ...(whereHome[Op.and] ?? []),
          buildPartnerLiteral(partnerList, !!includeOutdated),
        ];
      }

      const coordinationRequired = partnerRequired || (
        coordinationCondition &&
        !!hasCoordinationValue &&
        !!filters?.mode?.strictDetail
      );

      // Contact filters
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = buildContactOwnerIdSubquery(
          'home',
          contactTypes,
          includeOutdated,
          !!filters?.mode?.strictContact,
        );
        if (!includeOutdated) whereContact.isRestricted = false;
        if (sub) whereContact.homeId = { [Op.in]: sub };
      }

      // Address filters
      const addresses = filters?.address || {};
      const addrRequired = [
        addresses.countries,
        addresses.regions,
        addresses.districts,
        addresses.localities,
      ].some((items) => (items?.length ?? 0) > 0);
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery(
          'home',
          addresses,
          includeOutdated,
          !!filters?.mode?.strictAddress,
        );
        if (!includeOutdated) whereAddress.isRestricted = false;
        if (sub) whereAddress.homeId = { [Op.in]: sub };
      }

      // Last update date filter
      const dates = filters?.general?.dateUpdateRange || [];
      const datesRequired = dates.length > 0;
      if (datesRequired) {
        whereUpdateDate.date = betweenDatesInclusive(filters.general.dateUpdateRange);
      }

      // Related data
      const includes = [
        {
          model: HomeContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact,
        },
        {
          model: HomeAddress,
          as: 'addresses',
          required: addrRequired,
          attributes: [
            'id',
            'isRestricted',
            'isRecoverable',
            'postalName',
            'postalCode',
            'postalAddressPart',
            'fullPostalAddress',
          ],
          where: whereAddress,
          include: [
            { model: Country, attributes: ['id', 'name'] },
            { model: Region, attributes: ['id', 'shortName'] },
            { model: District, attributes: ['id', 'shortName'] },
            { model: Locality, attributes: ['id', 'shortName'] },
          ],
        },
        {
          model: HomeOutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'officialName'],
        },
        {
          model: HomeCoordination,
          as: 'coordinations',
          attributes: [
            'id',
            'partnerId',
            'homeId',
            'isRecoverable',
            'isRestricted',
          ],
          required: coordinationRequired,
          where: whereCoordination,
          include: [
            {
              model: Partner,
              as: 'partner',
              attributes: [
                'firstName',
                'patronymic',
                'lastName',
                'affiliation',
                'position',
              ],
              include: [
                {
                  model: PartnerContact,
                  as: 'contacts',
                  where: { isRestricted: false },
                  attributes: ['id', 'type', 'content', 'isRestricted'],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: HomeUpdateDate,
          as: 'updateDates',
          attributes: ['date'],
          required: datesRequired,
          where: whereUpdateDate,
        },
      ];
      if (sort?.[0]?.field === 'regionName') {
        includes.push({
          model: HomeAddress,
          as: 'activeAddress',
          attributes: [],
          required: false,
          include: [{ model: Region, as: 'region', attributes: [] }],
        });
      }

      // Search
      // Exact search requires every word; non-exact search accepts any word.
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: HomeSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          },
        });
      }

      // Total count
      const total = await Home.count({
        where: whereHome,
        include: includes,
        distinct: true,
      });

      // Fetch homes with optional pagination
      const params = pageSize
        ? {
          where: whereHome,
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          order,
          include: includes,
          offset: pageSize * pageNumber,
          limit: pageSize,
          distinct: true,
        }
        : {
          where: whereHome,
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          order,
          include: includes,
          distinct: true,
        };

      const homes = await Home.findAll(params);
      const items = homes.map((home) =>
        transformOwnerData('home', home.toJSON()),
      );

      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-home-by-id/:id',
  requireAuth,
  requireAny('VIEW_HOME', 'EDIT_HOME'),
  validateRequest(homeSchemas.homeIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const home = await Home.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: HOME_DETAILS_INCLUDE,
      });
      if (!home) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      const data = transformOwnerData('home', home.toJSON());
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-list-of-active-homes',
  requireAuth,
  requireAny('VIEW_PARTNER',
    'EDIT_PARTNER',
    'ADD_PARTNER',
    'VIEW_SENIOR',
    'EDIT_SENIOR',
    'ADD_NEW_SENIOR',
    'VIEW_LIMITED_PARTNERS_LIST',
    'VIEW_FULL_PARTNERS_LIST',
    'VIEW_LIMITED_SENIORS_LIST',
    'VIEW_FULL_SENIORS_LIST'),
  async (req, res, next) => {
    try {
      const homes = await Home.findAll({
        attributes: [
          'id',
          'homeName',
          'noAddress',
          'specialHome',
          'acceptableForSchool'
        ],
        where: { isRestricted: false, isClose: false },
        include: [{
          model: HomeAddress,
          as: 'addresses',
          attributes: ['id', 'fullPostalAddress', 'countryId', 'regionId', 'districtId', 'localityId'],
          where: { isRestricted: false },
          include: [
            { model: Region, attributes: ['shortName'] }
          ]
        },],
        order: [['homeName', 'ASC']]
      });

      const data = homes.map(h => ({
        id: h.id,
        name: (h.homeName + ' - ' + h.addresses[0].region.shortName),
        fullPostalAddress: h.addresses[0].fullPostalAddress,
        countryId: h.addresses[0].countryId,
        regionId: h.addresses[0].regionId,
        districtId: h.addresses[0].districtId,
        localityId: h.addresses[0].localityId,
        noAddress: h.noAddress,
        specialHome: h.specialHome,
        acceptableForSchool: h.acceptableForSchool
      }));

      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-list-of-potential-homes',
  requireAuth,
  requireAny('VIEW_PARTNER',
    'EDIT_PARTNER',
    'ADD_PARTNER',
    'VIEW_SENIOR',
    'EDIT_SENIOR',
    'ADD_NEW_SENIOR',
    'VIEW_LIMITED_PARTNERS_LIST',
    'VIEW_FULL_PARTNERS_LIST',
    'VIEW_LIMITED_SENIORS_LIST',
    'VIEW_FULL_SENIORS_LIST'),
  async (req, res, next) => {
    try {
      const homes = await Home.findAll({
        attributes: [
          'id',
          'homeName',
          'isRestricted',
          'isClose'
        ],
        where: { isClose: false },
        include: [{
          model: HomeAddress,
          as: 'addresses',
          attributes: ['id', 'fullPostalAddress', 'countryId', 'regionId', 'districtId', 'localityId'],
          where: { isRestricted: false },
          include: [
            { model: Region, attributes: ['shortName'] }
          ]
        },],
        order: [['homeName', 'ASC']]
      });

      const data = homes.map(h => ({
        id: h.id,
        name: (h.homeName + ' - ' + h.addresses[0].region.shortName),
        fullPostalAddress: h.addresses[0].fullPostalAddress,
        countryId: h.addresses[0].countryId,
        regionId: h.addresses[0].regionId,
        districtId: h.addresses[0].districtId,
        localityId: h.addresses[0].localityId,
        isRestricted: h.isRestricted,
        isClose: h.isClose,
        homeStatus: setHomeStatusValue(h)
      }));

      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-list-of-homes',
  requireAuth,
  requireAny('VIEW_PARTNER',
    'EDIT_PARTNER',
    'ADD_PARTNER',
    'VIEW_SENIOR',
    'EDIT_SENIOR',
    'ADD_NEW_SENIOR',
    'VIEW_LIMITED_PARTNERS_LIST',
    'VIEW_FULL_PARTNERS_LIST',
    'VIEW_LIMITED_SENIORS_LIST',
    'VIEW_FULL_SENIORS_LIST'),
  async (req, res, next) => {
    try {
      const homes = await Home.findAll({
        attributes: [
          'id',
          'homeName',
          'isRestricted',
          'isClose',
          'noAddress',
          'specialHome',
          'acceptableForSchool'],
        include: [{
          model: HomeAddress,
          as: 'addresses',
          attributes: ['id', 'fullPostalAddress', 'countryId', 'regionId', 'districtId', 'localityId'],
          where: { isRestricted: false },
          include: [
            { model: Region, attributes: ['shortName'] }
          ]
        },],
        order: [['homeName', 'ASC']]
      });

      const data = homes.map(h => ({
        id: h.id,
        name: (h.homeName + ' - ' + h.addresses[0].region.shortName),
        fullPostalAddress: h.addresses[0].fullPostalAddress,
        countryId: h.addresses[0].countryId,
        regionId: h.addresses[0].regionId,
        districtId: h.addresses[0].districtId,
        localityId: h.addresses[0].localityId,
        isRestricted: h.isRestricted,
        isClose: h.isClose,
      }));

      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

async function countHomeDependencies(homeId, transaction) {
  const [seniorCount, coordinationCount] = await Promise.all([
    Senior.count({
      where: { homeId },
      transaction,
    }),
    HomeCoordination.count({
      where: { homeId },
      transaction,
    }),
  ]);

  return seniorCount + coordinationCount;
}

router.get(
  '/check-home-before-delete/:id',
  requireAuth,
  requireOperation('DELETE_HOME'),
  validateRequest(homeSchemas.homeIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const home = await Home.findByPk(id);
      if (!home) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

      const count = await countHomeDependencies(id);
      const response = {
        data: count,
        ...(count ? { code: 'ERRORS.HOME.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.delete(
  '/delete-home/:id',
  requireAuth,
  requireOperation('DELETE_HOME'),
  validateRequest(homeSchemas.homeIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (transaction) => {
        const home = await Home.findByPk(id, { transaction });
        if (!home) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        const dependenciesCount = await countHomeDependencies(
          id,
          transaction,
        );
        if (dependenciesCount > 0) {
          throw new CustomError('HOME.HAS_DEPENDENCIES', 409);
        }

        const destroyed = await Home.destroy({
          where: { id },
          transaction,
          individualHooks: true,
        });
        if (destroyed !== 1) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }
      });
      res.status(200).send({ code: 'SUCCESS.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';
      next(error);
    }
  },
);

router.patch(
  '/block-home',
  requireAuth,
  requireOperation('BLOCK_HOME'),
  validateRequest(homeSchemas.homeBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (transaction) => {
        const [affected] = await Home.update(
          {
            isRestricted: true,
            causeOfRestriction: cause,
            dateOfRestriction: new Date(),
          },
          {
            where: { id },
            transaction,
            individualHooks: true,
          }
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }
        await syncRecipientsAfterHomeUpdate(
          id,
          { isRestricted: true },
          transaction,
        );
        await refreshHomeSearch(
          id,
          transaction,
        );
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

router.patch(
  '/unblock-home',
  requireAuth,
  requireOperation('UNBLOCK_HOME'),
  validateRequest(homeSchemas.homeIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      await withTransaction(async (transaction) => {
        const [affected] = await Home.update(
          {
            isRestricted: false,
            causeOfRestriction: null,
            dateOfRestriction: null,
          },
          {
            where: { id },
            transaction,
            individualHooks: true,
          },
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }
        await syncRecipientsAfterHomeUpdate(
          id,
          { isRestricted: false },
          transaction,
        );
        await refreshHomeSearch(
          id,
          transaction,
        );
      });
      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-home-groups/',
  requireAuth,
  requireOperation('ADD_NEW_RECIPIENT'),
  async (req, res, next) => {
    try {
      const homes = await Home.findAll({
        attributes: [
          'id',
          'homeName',
        ],
        where: { isClose: false, isRestricted: false },
        include: [{
          model: HomeAddress,
          as: 'activeAddress',
          attributes: ['id'],
          include: [
            { model: Region, attributes: ['name'] }
          ]
        },],
      });

      const groupsMap = new Map();

      for (const home of homes) {
        const regionName = home.activeAddress?.region?.name;

        if (!regionName) continue;

        if (!groupsMap.has(regionName)) {
          groupsMap.set(regionName, {
            regionName,
            homes: [],
          });
        }

        groupsMap.get(regionName).homes.push({
          id: home.id,
          homeName: home.homeName,
        });
      }

      const data = [...groupsMap.values()].sort((a, b) =>
        a.regionName.localeCompare(b.regionName, 'ru'),
      );

      for (const group of data) {
        group.homes.sort((a, b) =>
          a.homeName.localeCompare(b.homeName, 'ru'),
        );
      }

      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

export default router;
