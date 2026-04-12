import { Router } from "express";
import { Op, Sequelize } from 'sequelize';
import {
  Country, Region, District, Locality, Home,
  PartnerAddress, Partner, PartnerContact, PartnerSearch, PartnerOutdatedName, HomeCoordination,
  HomeAddress
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as partnerSchemas from "../../shared/dist/partner.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { collectFlatContacts, findDuplicateContacts, fullName, saveOwnerContactsAndAddress } from "../controllers/ctrl-create-owner-contacts-address.js";
import { createSearchStringFor, createOutdatedSearchStringFor } from "../controllers/ctrl-search-string.js";
import { betweenDatesInclusive, buildAddressOwnerIdSubquery, buildContactOwnerIdSubquery, buildOrderFor, buildSearchContentWhere } from "../controllers/ctrl-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates, updateCoordinationByPartner } from "../controllers/ctrl-apply-owner-updates.js";

const router = Router();
const includes = [
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
    ]
  },
  {
    model: HomeCoordination,
    as: 'coordinations',
    attributes: ['id', 'homeId', 'partnerId', 'isRecoverable', 'isRestricted'],
    include: [
      /*       {
              model: Partner,
              as: 'partner',
              attributes: ['firstName', 'patronymic', 'lastName'],
              include: [
                {
                  model: PartnerContact,
                  as: 'contacts',
                  where: { isRestricted: false },
                  attributes: ['content', 'isRestricted'],
                },
              ]
            }, */
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
            include: [
              {
                model: Region,
                attributes: ['shortName']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    model: PartnerOutdatedName,
    as: 'outdatedNames',
    attributes: ['id', 'firstName', 'patronymic', 'lastName']
  },
];



// API create partner

router.post(
  "/check-partner-data",
  requireAuth,
  requireAny('ADD_NEW_PARTNER', 'EDIT_PARTNER'),
  validateRequest(partnerSchemas.checkPartnerDataSchema, "body"),
  async (req, res, next) => {
    try {
      let partner = req.body;
      const excludeSelf = partner.id ? { id: { [Op.ne]: partner.id } } : {};

      const nameRows = partner.lastName ? await Partner.findAll({
        where: {
          ...excludeSelf,
          firstName: { [Op.iLike]: partner.firstName },
          lastName: { [Op.iLike]: partner.lastName },
        },
        attributes: ['firstName', 'patronymic', 'lastName'],
        raw: true
      }) : [];
      const duplicatesName = nameRows.map(row => fullName(row));

      const flat = collectFlatContacts(partner.contacts);
      const duplicatesContact = await findDuplicateContacts({
        ownerKind: 'partner',
        models: { Partner, PartnerContact },
        excludeSelf: partner.id ? { id: { [Op.ne]: partner.id } } : {},
        flatContacts: flat,
      });

      let response = { data: { duplicatesName, duplicatesContact } };
      if (duplicatesName.length > 0 || duplicatesContact.length > 0) response.code = 'PARTNER.HAS_DATA_DUPLICATES';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.DUPLICATES_NOT_CHECKED';
      next(error);
    }
  });

router.post(
  '/create-partner',
  requireAuth,
  requireOperation('ADD_NEW_PARTNER'),
  validateRequest(partnerSchemas.partnerDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingPartner = req.body;

      //console.log('creatingPartner', creatingPartner)

      const result = await withTransaction(async (t) => {

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
          { transaction: t }
        );

        await saveOwnerContactsAndAddress(
          'partner',
          partner,
          creatingPartner, // { draftContacts, draftAddress }
          { PartnerContact, PartnerAddress },
          t
        );

        if (creatingPartner.draftCoordinations.length) {
          const coordinationRows = creatingPartner.draftCoordinations.map(
            id => ({
              partnerId: partner.id,
              homeId: id,
              isRestricted: creatingPartner.isRestricted,
              isRecoverable: !creatingPartner.isRestricted,
            })
          )
          await HomeCoordination.bulkCreate(coordinationRows, {
            validate: true,
            individualHooks: true,
            transaction: t,
          });

        }

        const freshPartner = await Partner.findOne({
          where: { id: partner.id },
          attributes: {
            exclude: [
              'createdAt',
              'updatedAt']
          },
          include: includes,
          transaction: t,
        });

        const searchString = createSearchStringFor('partner', freshPartner);
        await PartnerSearch.create({ partnerId: partner.id, content: searchString }, { transaction: t });

        return fullName(partner);
      });

      res.status(201).send({ code: 'PARTNER.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_CREATED';
      next(error);
    }
  }
);

router.post(
  '/update-partner',
  requireAuth,
  requireOperation('EDIT_PARTNER'),
  validateRequest(partnerSchemas.updatePartnerDataSchema, 'body'),
  async (req, res, next) => {
    const { id, changingData, restoringData, outdatingData, deletingData } = req.body;

    try {
      const result = await withTransaction(async (t) => {
        const partner = await Partner.findByPk(id, { transaction: t });
        if (!partner) throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);
        // CHANGES
        // main
        if (changingData?.main) {
          console.log('changes?.main', changingData?.main);
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Partner.update(
              payload,
              {
                where: { id },
                transaction: t,
                individualHooks: true
              });
          }
        }

        //addresses, contacts, coordinations, outdated
        await applyOwnerUpdates(
          'partner',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          t
        );

        if (changingData.main?.isRestricted === true || changingData.main?.isRestricted === false)
          await updateCoordinationByPartner(changingData.main.isRestricted, id, t);

        // UPDATED PARTNER
        const fresh = await Partner.findOne({
          where: { id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: includes,
          transaction: t,
        });

        // SEARCH
        const search = createSearchStringFor('partner', fresh);
        await PartnerSearch.update(
          { content: search },
          { where: { partnerId: id, isRestricted: false }, individualHooks: true, transaction: t }
        );
        const outdatedSearch = createOutdatedSearchStringFor('partner', fresh);
        if (outdatedSearch) {
          const [row, created] = await PartnerSearch.findOrCreate({
            where: { partnerId: id, isRestricted: true },
            defaults: { content: outdatedSearch },
            transaction: t
          });
          if (!created) await row.update({ content: outdatedSearch }, { individualHooks: true, transaction: t });
        }
        return transformOwnerData('partner', fresh.toJSON());
      });
      console.log('PARTNER');
      console.dir(result, { depth: null });
      res.status(200).send({ code: 'PARTNER.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_UPDATED';
      next(error);
    }
  }
);

// API get partners

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
      } = req.body; // already validated by Zod

      const includeOutdated = !!view?.includeOutdated; // false => only actual
      const order = buildOrderFor('partner', sort);

      // ---- base where (Partner) ----
      const wherePartner = {};
      const whereAddress = !includeOutdated ? { isRestricted: false } : {};
      const whereContact = !includeOutdated ? { isRestricted: false } : {};
      //const whereHomeAddress = { isRestricted: false };
      const whereCoordination = !includeOutdated ? { isRestricted: false } : {};


      // view option
      switch (view?.option) {
        case 'only-active': wherePartner.isRestricted = false; break;
        case 'only-blocked': wherePartner.isRestricted = true; break;
        default: break;
      }

      /*       const options = view?.option ?? [];
            if (options.includes('all')) { }
            if (options.includes('active') && options.length == 1) { wherePartner.isRestricted = false; }
            if (options.includes('blocked') && options.length == 1) { wherePartner.isRestricted = true; }
       */

      console.log('filters?.general?.affiliations', filters?.general?.affiliations);

      // general filters
      if (filters?.general?.affiliations?.length) {
        wherePartner.affiliation = { [Op.in]: filters.general.affiliations };
      }

      if (filters?.general?.dateBeginningRange) {
        wherePartner.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        wherePartner.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }

      // coordination filter

      const buildHomeLiteral = (homeList, includeOutdated) => {
        const restrictedClause = includeOutdated ? '' : 'AND c."isRestricted" = false';

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
        const restrictedClause = includeOutdated ? '' : 'AND c."isRestricted" = false';

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
        const restrictedClause = includeOutdated ? '' : 'AND c."isRestricted" = false';

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

      // details && hasCoordination filter
      const hasCoordinationValue = filters?.general?.hasCoordination;
      const coordinationCondition = hasCoordinationValue !== undefined && hasCoordinationValue !== null;

      const hasCoordination = coordinationCondition
        ? buildCoordinationLiteral(!!hasCoordinationValue, !!includeOutdated)
        : undefined;


      const details = filters?.general?.details ?? [];
      if (details.length > 0) {
        const strict = !!filters?.mode?.strictDetail;
        const op = strict ? Op.and : Op.or;

        wherePartner[op] = [
          ...details.map(detail => ({ [detail]: { [Op.not]: null } })),
          ...(hasCoordination ? [hasCoordination] : []),
        ];
      } else if (hasCoordination) {
        wherePartner[Op.and] = [hasCoordination];
      }

      // homeRegions filter
      const homeRegions = filters?.general?.homeRegions || [];
      const homeAddressRequired = (homeRegions.length ?? 0) > 0;
      if (homeAddressRequired) {
        const regionList = homeRegions.map(Number).join(',');

        wherePartner[Op.and] = [
          ...(wherePartner[Op.and] ?? []),
          buildHomeRegionLiteral(regionList, !!includeOutdated),
        ];
      }

      // homes filter
      const homes = filters?.general?.homes || [];
      const homeRequired = (homes.length ?? 0) > 0;
      if (homeRequired && (homeRegions.length ?? 0) <= 1) {
        const homeList = homes.map(Number).join(',');

        wherePartner[Op.and] = [
          ...(wherePartner[Op.and] ?? []),
          buildHomeLiteral(homeList, !!includeOutdated),
        ];
      }



      const coordinationRequired =
        homeRequired ? true : (
          homeAddressRequired ? true : (
            coordinationCondition ? (!!hasCoordinationValue && !!filters?.mode?.strictDetail) :
              false
          )
        );

      // contact types filter (weak/strong)
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = buildContactOwnerIdSubquery('partner', contactTypes, includeOutdated ? true : false, !!filters?.mode?.strictContact);

        if (sub) whereContact.partnerId = { [Op.in]: sub };
      }

      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = (addresses.countries?.length ?? 0) > 0;
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery('partner', addresses, includeOutdated ? true : false, !!filters?.mode?.strictAddress);

        if (sub) whereAddress.partnerId = { [Op.in]: sub };
      }



      // ---- includes (contacts / addresses / coordinations / outdated names / search) ----
      const includes = [
        {
          model: PartnerContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact
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
          ]
        },
        {
          model: PartnerOutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'firstName', 'patronymic', 'lastName'],
          // separate: true,
        },

        {
          model: HomeCoordination,
          as: 'coordinations',
          attributes: ['id', 'homeId', 'partnerId', 'isRecoverable', 'isRestricted'],
          required: coordinationRequired,
          where: whereCoordination,
          include: [
            {
              model: Home,
              as: 'home',
              attributes: ['homeName', 'isClose', 'isRestricted'],
              // where: whereHome,
              // required: homesRequired,
              include: [
                {
                  model: HomeAddress,
                  as: 'addresses',
                  attributes: ['id'],
                  where: { isRestricted: false },//whereHomeAddress,
                  required: false, //homeAddressRequired,
                  include: [
                    {
                      model: Region,
                      attributes: ['shortName']
                    }
                  ]
                }
              ]
            }
          ]
        },
      ];

      // search by PartnerSearch.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: PartnerSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          }
        });
      }
      //  console.log('INCLUDES', includes);
      //  console.log(JSON.stringify(includes, null, 2));



      // ---- count (distinct) ----
      const total = await Partner.count({
        where: wherePartner,
        include: includes,
        distinct: true,
      });

      // console.log('wherePartner', wherePartner);
      // console.log('ORDER', order);
      /*  console.log('includes', includes);
       console.log('wherePartner', wherePartner); */

      // ---- page ----
      const partners = await Partner.findAll({
        where: wherePartner,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        //subQuery: false, // avoid subquery limits in includes
        distinct: true,
      });
      console.log('PARTNERS', partners);
      console.log(JSON.stringify(partners, null, 2));
      const items = partners.map(p => transformOwnerData('partner', p.toJSON()));
      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.LIST_FAILED';
      next(error);
    }
  }
);

router.get("/get-partner-by-id/:id",
  requireAuth,
  requireAny('VIEW_PARTNER', 'EDIT_PARTNER'),
  validateRequest(partnerSchemas.partnerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const partner = await Partner.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: includes,
      });
      if (!partner) throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);
      const data = transformOwnerData('partner', partner.toJSON());
      console.log('PARTNER', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_FOUND';
      next(error);
    }
  });

router.get("/get-list-of-active-partners",
  requireAuth,
  requireAny('VIEW_HOME', 'EDIT_HOME', 'ADD_HOME', 'VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'),
  async (req, res, next) => {
    try {
      const partners = await Partner.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        where: { isRestricted: false },
        order: [['firstName', 'ASC']]
      });

      const data = partners.map(p => ({ id: p.id, name: fullName(p) }));
      //  console.log('PARTNERS', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.LIST_FAILED';
      next(error);
    }
  });

router.get("/get-list-of-partners",
  requireAuth,
  requireAny('VIEW_HOME', 'EDIT_HOME', 'ADD_HOME', 'VIEW_LIMITED_HOMES_LIST', 'VIEW_FULL_HOMES_LIST'),
  async (req, res, next) => {
    try {
      const partners = await Partner.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        //where: { isRestricted: false },
        order: [['firstName', 'ASC']]
      });

      const data = partners.map(p => ({ id: p.id, name: fullName(p), isRestricted: p.isRestricted }));
      //  console.log('PARTNERS', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.LIST_FAILED';
      next(error);
    }
  });

router.get(
  "/check-partner-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_PARTNER'),
  validateRequest(partnerSchemas.partnerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const partner = await Partner.findByPk(id);
      if (!partner) throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);

      //TODO: find does this partner has houses
      const [countHouses] = await Promise.all([
        HomeCoordination.count({
          where: { partnerId: id }
        }),
      ]);
      const count = (countHouses ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'PARTNER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_CHECKED';
      next(error);
    }
  });

router.delete(
  "/delete-partner/:id",
  requireAuth,
  requireOperation('DELETE_PARTNER'),
  validateRequest(partnerSchemas.partnerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        // 1) Ensure the partner exists
        const partner = await Partner.findByPk(id, { transaction: t });
        if (!partner) throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);

        // 2) Delete the partner (DB will cascade child tables)
        const destroyed = await Partner.destroy({
          where: { id },
          transaction: t,
          individualHooks: true, // will run partner-level hooks; children won't fire via DB cascade
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'PARTNER.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_DELETED';
      next(error);
    }
  });

router.get(
  "/check-partner-before-block/:id",
  requireAuth,
  requireOperation('BLOCK_PARTNER'),
  validateRequest(partnerSchemas.partnerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const partner = await Partner.findByPk(id);
      if (!partner) throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);

      //TODO: find does this partner has actual houses -we blocked coordinations after blocking partner
      /*       const [countHouses] = await Promise.all([
              HomeCoordination.count({
                where: { partnerId: id, isRestricted: false }
              }),
            ]);
            const count = (countHouses ?? 0); */
      const count = 0;
      const response = {
        data: count,
        ...(count ? { code: 'PARTNER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_CHECKED';
      next(error);
    }
  });

router.patch(
  '/block-partner',
  requireAuth,
  requireAny('BLOCK_PARTNER'),
  validateRequest(partnerSchemas.partnerBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (t) => {
        // 1) Block the partner
        const [affected] = await Partner.update(
          {
            isRestricted: true,
            causeOfRestriction: cause,
            dateOfRestriction: new Date(),
          },
          {
            where: { id },
            transaction: t,
            individualHooks: true, // ensure per-row hooks/audit
          }
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);
        }
        await updateCoordinationByPartner(true, id, t);
      });

      res.status(200).send({ code: 'PARTNER.BLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_BLOCKED';
      next(error);
    }
  }
);

router.patch(
  "/unblock-partner",
  requireAuth,
  requireAny('UNBLOCK_PARTNER'),
  validateRequest(partnerSchemas.partnerIdSchema, 'body'),
  async (req, res, next) => {
    try {
      let id = req.body.id;
      await withTransaction(async (t) => {
        const [affected] = await Partner.update(
          {
            isRestricted: false,
            causeOfRestriction: null,
            dateOfRestriction: null
          },
          {
            where: { id },
            individualHooks: true,
          },
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.PARTNER.NOT_FOUND', 404);
        }
        await updateCoordinationByPartner(false, id, t);
      });
      res.status(200).send({ code: 'PARTNER.UNBLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.PARTNER.NOT_UNBLOCKED';
      next(error);
    }
  });
export default router;
