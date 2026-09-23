import { Router } from 'express';
import { Op, Sequelize } from 'sequelize';
import {
  Country,
  District,
  Home,
  HomeAddress,
  HomeCoordination,
  Locality,
  Partner,
  PartnerAddress,
  PartnerContact,
  PartnerOutdatedName,
  PartnerSearch,
  Region,
} from '../models/index.js';
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from '../middlewares/validate-request.js';
import CustomError from '../shared/customError.js';
import * as partnerSchemas from '../../shared/dist/schemas/partner.schema.js';
import { withTransaction } from '../controllers/with-transaction.js';
import {
  collectFlatContacts,
  findDuplicateContacts,
  fullName,
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
import { transformOwnerData } from '../controllers/ctrl-transform-owner.js';
import {
  applyOwnerUpdates,
  updateCoordinationByPartner,
} from '../controllers/ctrl-apply-owner-updates.js';

const router = Router();

const PARTNER_DETAILS_INCLUDE = [
  {
    model: PartnerContact,
    as: 'contacts',
    attributes: ['id', 'type', 'content', 'isRestricted'],
  },
  {
    model: PartnerAddress,
    as: 'addresses',
    attributes: ['id', 'isRestricted'],
    include: [
      { model: Country, attributes: ['id', 'name'] },
      { model: Region, attributes: ['id', 'shortName', 'name'] },
      { model: District, attributes: ['id', 'shortName', 'name'] },
      { model: Locality, attributes: ['id', 'shortName', 'name'] },
    ],
  },
  {
    model: HomeCoordination,
    as: 'coordinations',
    attributes: [
      'id',
      'homeId',
      'partnerId',
      'isRecoverable',
      'isRestricted',
    ],
    include: [
      {
        model: Home,
        as: 'home',
        attributes: ['homeName', 'isRestricted', 'isClose'],
        include: [
          {
            model: HomeAddress,
            as: 'addresses',
            attributes: ['id'],
            where: { isRestricted: false },
            required: false,
            include: [
              {
                model: Region,
                attributes: ['shortName'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    model: PartnerOutdatedName,
    as: 'outdatedNames',
    attributes: ['id', 'firstName', 'patronymic', 'lastName'],
  },
];

async function refreshPartnerSearch(partnerId, transaction) {
  const partner = await Partner.findByPk(partnerId, {
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: PARTNER_DETAILS_INCLUDE,
    transaction,
  });

  if (!partner) return;

  const content = createSearchStringFor('partner', partner);

  await PartnerSearch.update(
    { content },
    {
      where: {
        partnerId,
        isRestricted: false,
      },
      individualHooks: true,
      transaction,
    },
  );
}

router.post(
  '/check-partner-data',
  requireAuth,
  requireAny('ADD_NEW_PARTNER', 'EDIT_PARTNER'),
  validateRequest(partnerSchemas.checkPartnerDataSchema, 'body'),
  async (req, res, next) => {
    try {
      const partner = req.body;
      const excludeSelf = partner.id ? { id: { [Op.ne]: partner.id } } : {};

      const nameRows = partner.lastName
        ? await Partner.findAll({
          where: {
            ...excludeSelf,
            firstName: { [Op.iLike]: partner.firstName },
            lastName: { [Op.iLike]: partner.lastName },
          },
          attributes: ['firstName', 'patronymic', 'lastName'],
          raw: true,
        })
        : [];
      const duplicatesName = nameRows.map((row) => fullName(row));

      const flat = collectFlatContacts(partner.contacts);
      const duplicatesContact = await findDuplicateContacts({
        ownerKind: 'partner',
        models: { Partner, PartnerContact },
        excludeSelf: partner.id ? { id: { [Op.ne]: partner.id } } : {},
        flatContacts: flat,
      });

      let response = { data: { duplicatesName, duplicatesContact } };
      if (duplicatesName.length > 0 || duplicatesContact.length > 0) {
        response.code = 'ERRORS.PARTNER.HAS_DATA_DUPLICATES';
      }
      res.status(200).send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.post(
  '/create-partner',
  requireAuth,
  requireOperation('ADD_NEW_PARTNER'),
  validateRequest(partnerSchemas.partnerDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingPartner = req.body;

      const result = await withTransaction(async (transaction) => {
        const partner = await Partner.create(
          {
            firstName: creatingPartner.firstName,
            patronymic: creatingPartner.patronymic,
            lastName: creatingPartner.lastName,
            affiliation: creatingPartner.affiliation,
            position: creatingPartner.position,
            comment: creatingPartner.comment,
            isRestricted: creatingPartner.isRestricted,
            causeOfRestriction: creatingPartner.causeOfRestriction,
            dateOfRestriction: creatingPartner.dateOfRestriction,
          },
          { transaction },
        );

        await saveOwnerContactsAndAddress(
          'partner',
          partner,
          creatingPartner,
          { PartnerContact, PartnerAddress },
          transaction,
        );

        if (creatingPartner.draftCoordinations.length) {
          const coordinationRows = creatingPartner.draftCoordinations.map(
            (id) => ({
              partnerId: partner.id,
              homeId: id,
              isRestricted: creatingPartner.isRestricted,
              isRecoverable: !creatingPartner.isRestricted,
            }),
          );
          await HomeCoordination.bulkCreate(coordinationRows, {
            validate: true,
            individualHooks: true,
            transaction,
          });
        }

        const freshPartner = await Partner.findOne({
          where: { id: partner.id },
          attributes: {
            exclude: [
              'createdAt',
              'updatedAt']
          },
          include: PARTNER_DETAILS_INCLUDE,
          transaction,
        });

        const searchString = createSearchStringFor('partner', freshPartner);
        await PartnerSearch.create(
          { partnerId: partner.id, content: searchString },
          { transaction },
        );

        return fullName(partner);
      });

      res.status(201).send({ code: 'SUCCESS.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      next(error);
    }
  },
);

router.post(
  '/update-partner',
  requireAuth,
  requireOperation('EDIT_PARTNER'),
  validateRequest(partnerSchemas.updatePartnerDataSchema, 'body'),
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
        const partner = await Partner.findByPk(id, { transaction });
        if (!partner) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        if (changingData?.main) {
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Partner.update(payload, {
              where: { id },
              transaction,
              individualHooks: true,
            });
          }
        }

        await applyOwnerUpdates(
          'partner',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          transaction,
        );

        if (typeof changingData?.main?.isRestricted === 'boolean') {
          await updateCoordinationByPartner(
            changingData.main.isRestricted,
            id,
            transaction,
          );
        }

        const fresh = await Partner.findOne({
          where: { id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: PARTNER_DETAILS_INCLUDE,
          transaction,
        });

        const search = createSearchStringFor('partner', fresh);
        await PartnerSearch.update(
          { content: search },
          {
            where: { partnerId: id, isRestricted: false },
            individualHooks: true,
            transaction,
          },
        );
        const outdatedSearch = createOutdatedSearchStringFor('partner', fresh);
        if (outdatedSearch) {
          const [row, created] = await PartnerSearch.findOrCreate({
            where: { partnerId: id, isRestricted: true },
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
          await PartnerSearch.destroy({
            where: {
              partnerId: id,
              isRestricted: true,
            },
            transaction,
          });
        }
        return transformOwnerData('partner', fresh.toJSON());
      });
      res.status(200).send({ code: 'SUCCESS.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

router.post(
  '/get-partners',
  requireAuth,
  requireAny('VIEW_LIMITED_PARTNERS_LIST', 'VIEW_FULL_PARTNERS_LIST'),
  validateRequest(partnerSchemas.partnersQueryDTOSchema, 'body'),
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
      const order = buildOrderFor('partner', sort);

      // Base filters
      const wherePartner = {};
      const whereAddress = !includeOutdated ? { isRestricted: false } : {};
      const whereContact = !includeOutdated ? { isRestricted: false } : {};
      const whereCoordination = !includeOutdated ? { isRestricted: false } : {};


      // View option
      switch (view?.option) {
        case 'only-active':
          wherePartner.isRestricted = false;
          break;
        case 'only-blocked':
          wherePartner.isRestricted = true;
          break;
        default:
          break;
      }

      // General filters
      if (filters?.general?.affiliations?.length) {
        wherePartner.affiliation = { [Op.in]: filters.general.affiliations };
      }

      if (filters?.general?.dateBeginningRange) {
        wherePartner.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        wherePartner.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }

      // Coordination filters
      const buildHomeLiteral = (homeList, includeOutdated) => {
        const restrictedClause = includeOutdated
          ? ''
          : 'AND c."isRestricted" = false';

        return Sequelize.literal(`
          EXISTS (
            SELECT 1
              FROM "home-coordinations" c
              WHERE c."partnerId" = "partner"."id"
              AND c."homeId" IN (${homeList})
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
            WHERE c."partnerId" = "partner"."id"
            ${restrictedClause}
          )
        `);
      };

      const buildHomeRegionLiteral = (regionList, includeOutdated) => {
        const restrictedClause = includeOutdated
          ? ''
          : 'AND c."isRestricted" = false';

        return Sequelize.literal(`
          EXISTS (
            SELECT 1
              FROM "home-coordinations" c
              JOIN "home-addresses" a
              ON a."homeId" = c."homeId"
              AND a."isRestricted" = false
              WHERE c."partnerId" = "partner"."id"
              ${restrictedClause}
              AND a."regionId" IN (${regionList})
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

        wherePartner[op] = [
          ...details.map((detail) => ({ [detail]: { [Op.not]: null } })),
          ...(hasCoordination ? [hasCoordination] : []),
        ];
      } else if (hasCoordination) {
        wherePartner[Op.and] = [hasCoordination];
      }

      const homeRegions = filters?.general?.homeRegions || [];
      const homeAddressRequired = homeRegions.length > 0;
      if (homeAddressRequired) {
        const regionList = homeRegions.map(Number).join(',');

        wherePartner[Op.and] = [
          ...(wherePartner[Op.and] ?? []),
          buildHomeRegionLiteral(regionList, !!includeOutdated),
        ];
      }

      const homes = filters?.general?.homes || [];
      const homeRequired = homes.length > 0;
      if (homeRequired && homeRegions.length <= 1) {
        const homeList = homes.map(Number).join(',');

        wherePartner[Op.and] = [
          ...(wherePartner[Op.and] ?? []),
          buildHomeLiteral(homeList, !!includeOutdated),
        ];
      }

      const coordinationRequired =
        homeRequired ||
        homeAddressRequired ||
        (
          coordinationCondition &&
          !!hasCoordinationValue &&
          !!filters?.mode?.strictDetail
        );

      // Contact filters
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = buildContactOwnerIdSubquery(
          'partner',
          contactTypes,
          includeOutdated,
          !!filters?.mode?.strictContact,
        );

        if (sub) whereContact.partnerId = { [Op.in]: sub };
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
          'partner',
          addresses,
          includeOutdated,
          !!filters?.mode?.strictAddress,
        );

        if (sub) whereAddress.partnerId = { [Op.in]: sub };
      }

      // Related data
      const includes = [
        {
          model: PartnerContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact,
        },
        {
          model: PartnerAddress,
          as: 'addresses',
          required: addrRequired,
          attributes: ['id', 'isRestricted', 'isRecoverable'],
          where: whereAddress,
          include: [
            { model: Country, attributes: ['id', 'name'] },
            { model: Region, attributes: ['id', 'shortName'] },
            { model: District, attributes: ['id', 'shortName'] },
            { model: Locality, attributes: ['id', 'shortName'] },
          ],
        },
        {
          model: PartnerOutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'firstName', 'patronymic', 'lastName'],
        },

        {
          model: HomeCoordination,
          as: 'coordinations',
          attributes: [
            'id',
            'homeId',
            'partnerId',
            'isRecoverable',
            'isRestricted',
          ],
          required: coordinationRequired,
          where: whereCoordination,
          include: [
            {
              model: Home,
              as: 'home',
              attributes: ['homeName', 'isClose', 'isRestricted'],
              include: [
                {
                  model: HomeAddress,
                  as: 'addresses',
                  attributes: ['id'],
                  where: { isRestricted: false },
                  required: false,
                  include: [
                    {
                      model: Region,
                      attributes: ['shortName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      /// Search by PartnerSearch content: exact requires all words, otherwise any word
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: PartnerSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          },
        });
      }

      // Total count
      const total = await Partner.count({
        where: wherePartner,
        include: includes,
        distinct: true,
      });

      // Paginated result
      const partners = await Partner.findAll({
        where: wherePartner,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        distinct: true,
      });
      const items = partners.map((partner) =>
        transformOwnerData('partner', partner.toJSON()),
      );
      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-partner-by-id/:id',
  requireAuth,
  requireAny('VIEW_PARTNER', 'EDIT_PARTNER'),
  validateRequest(partnerSchemas.partnerIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const partner = await Partner.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: PARTNER_DETAILS_INCLUDE,
      });
      if (!partner) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      const data = transformOwnerData('partner', partner.toJSON());
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-list-of-active-partners',
  requireAuth,
  requireAny(
    'VIEW_HOME',
    'EDIT_HOME',
    'ADD_NEW_HOME',
    'VIEW_LIMITED_HOMES_LIST',
    'VIEW_FULL_HOMES_LIST',
  ),
  async (req, res, next) => {
    try {
      const partners = await Partner.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        where: { isRestricted: false },
        order: [['firstName', 'ASC']],
      });

      const data = partners.map((partner) => ({
        id: partner.id,
        name: fullName(partner),
      }));
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  '/get-list-of-partners',
  requireAuth,
  requireAny(
    'VIEW_HOME',
    'EDIT_HOME',
    'ADD_NEW_HOME',
    'VIEW_LIMITED_HOMES_LIST',
    'VIEW_FULL_HOMES_LIST',
  ),
  async (req, res, next) => {
    try {
      const partners = await Partner.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order: [['firstName', 'ASC']],
      });

      const data = partners.map((partner) => ({
        id: partner.id,
        name: fullName(partner),
        isRestricted: partner.isRestricted,
      }));
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

function countPartnerDependencies(partnerId, transaction) {
  return HomeCoordination.count({
    where: { partnerId },
    transaction,
  });
}

router.get(
  '/check-partner-before-delete/:id',
  requireAuth,
  requireOperation('DELETE_PARTNER'),
  validateRequest(partnerSchemas.partnerIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const partner = await Partner.findByPk(id);
      if (!partner) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

      const count = await countPartnerDependencies(id);
      const response = {
        data: count,
        ...(count ? { code: 'ERRORS.PARTNER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.delete(
  '/delete-partner/:id',
  requireAuth,
  requireOperation('DELETE_PARTNER'),
  validateRequest(partnerSchemas.partnerIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (transaction) => {
        const partner = await Partner.findByPk(id, { transaction });
        if (!partner) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        const dependenciesCount = await countPartnerDependencies(
          id,
          transaction,
        );
        if (dependenciesCount > 0) {
          throw new CustomError('ERRORS.PARTNER.HAS_DEPENDENCIES', 409);
        }

        const destroyed = await Partner.destroy({
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

router.get(
  '/check-partner-before-block/:id',
  requireAuth,
  requireOperation('BLOCK_PARTNER'),
  validateRequest(partnerSchemas.partnerIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const partner = await Partner.findByPk(id);
      if (!partner) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

      const count = await HomeCoordination.count({
        where: { partnerId: id, isRestricted: false },
      });
      const response = {
        data: count,
        ...(count ? { code: 'ERRORS.PARTNER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  });

router.patch(
  '/block-partner',
  requireAuth,
  requireOperation('BLOCK_PARTNER'),
  validateRequest(partnerSchemas.partnerBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (transaction) => {
        const [affected] = await Partner.update(
          {
            isRestricted: true,
            causeOfRestriction: cause,
            dateOfRestriction: new Date(),
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
        await updateCoordinationByPartner(true, id, transaction);
        await refreshPartnerSearch(id, transaction);
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

router.patch(
  '/unblock-partner',
  requireAuth,
  requireOperation('UNBLOCK_PARTNER'),
  validateRequest(partnerSchemas.partnerIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      await withTransaction(async (transaction) => {
        const [affected] = await Partner.update(
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
        await updateCoordinationByPartner(false, id, transaction);
        await refreshPartnerSearch(id, transaction);
      });
      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

export default router;
