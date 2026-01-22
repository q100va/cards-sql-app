import { Router } from "express";
import { Op } from 'sequelize';
import {
  Country, Region, District, Locality,
  HomeAddress, Home, HomeContact, HomeSearch, HomeOutdatedName,
  Partner, PartnerContact, HomeUpdateDate, HomeCoordination,// Senior
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as homeSchemas from "../../shared/dist/home.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { collectFlatContacts, findDuplicateContacts, fullName, saveOwnerContactsAndAddress } from "../controllers/ctrl-create-owner-contacts-address.js";
import { createSearchStringFor, createOutdatedSearchStringFor } from "../controllers/ctrl-search-string.js";
import { betweenDatesInclusive, buildAddressOwnerIdSubquery, buildContactOwnerIdSubquery, buildOrderFor, buildSearchContentWhere } from "../controllers/ctrl-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";

const router = Router();
const includes = [
  {
    model: HomeContact,
    as: 'contacts',
    attributes: ['id', 'type', 'content', 'isRestricted'],
  },
  {
    model: HomeAddress,
    as: 'addresses',
    attributes: [
      'id', 'isRestricted', 'isRecoverable', 'postalName', 'postalCode', 'postalAddressPart', 'fullPostalAddress'],
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
    ]
  },
  {
    model: HomeOutdatedName, as: 'outdatedNames',
    attributes: ['id', 'officialName']
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
          },
        ]
      }
    ]
  },
  {
    model: HomeUpdateDate,
    as: 'updateDates',
    attributes: ['date'],
    separate: true,
    limit: 1,
    order: [['date', 'DESC']]
  },

];

// API create home

router.get(
  "/check-home-name",
  requireAuth,
  requireAny('ADD_NEW_HOME', 'EDIT_HOME'),
  validateRequest(homeSchemas.checkHomeNameSchema, "query"),
  async (req, res, next) => {
    try {
      const homeName = req.query.homeName.toLowerCase();
      const id = req.query.id;

      const whereParams = id ? {
        homeName: { [Op.iLike]: homeName },
        id: { [Op.ne]: id },
      } : {
        homeName: { [Op.iLike]: homeName },
      };

      const duplicateCount = await Home.count({
        where: whereParams
      });

      const response = {
        data: duplicateCount !== 0,
        ...(duplicateCount ? { code: 'HOME.ALREADY_EXISTS' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NAME_NOT_CHECKED';
      next(error);
    }
  });

router.post(
  '/create-home',
  requireAuth,
  requireOperation('ADD_NEW_HOME'),
  validateRequest(homeSchemas.homeDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingHome = req.body;

      //  console.log('creatingHOME', creatingHome)

      const result = await withTransaction(async (t) => {

        const home = await Home.create(
          {
            homeName: creatingHome.homeName,
            officialName: creatingHome.officialName,
            // postalName: creatingHome.postalName,
            noAddress: creatingHome.noAddress,
            specialHome: creatingHome.specialHome,
            acceptableForSchool: creatingHome.acceptableForSchool,
            comment: creatingHome.comment,
            infoNote: creatingHome.infoNote,
            isRestricted: creatingHome.isRestricted,
            causeOfRestriction: creatingHome.causeOfRestriction,
            dateOfRestriction: creatingHome.dateOfRestriction,
          },
          { transaction: t }
        );
        /*         console.log('HOME', home.id);
                const freshHome1 = await Home.findOne({
                  where: { id: home.id },
                  transaction: t,
                });
                console.log('freshHOME1', freshHome1) */

        await saveOwnerContactsAndAddress(
          'home',
          home,
          creatingHome, // { draftContacts, draftAddress }
          { HomeContact, HomeAddress },
          t
        );


        if ((creatingHome.draftCoordinations ?? []).length) {
          await HomeCoordination.bulkCreate(
            creatingHome.draftCoordinations.map((id) => ({
              homeId: home.id,
              partnerId: id
            })),
            {
              transaction: t,
              individualHooks: true,
            }
          );
        }


        const freshHome = await Home.findOne({
          where: { id: home.id },
          attributes: {
            exclude: [
              'createdAt',
              'updatedAt']
          },
          include: includes,
          transaction: t,
        });

        //   console.log('freshHOME', freshHome)


        const searchString = createSearchStringFor('home', freshHome);
        await HomeSearch.create({ homeId: home.id, content: searchString }, { transaction: t });

        return fullName(home);
      });

      res.status(201).send({ code: 'HOME.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_CREATED';
      next(error);
    }
  }
);

router.post(
  '/update-home',
  requireAuth,
  requireOperation('EDIT_HOME'),
  validateRequest(homeSchemas.updateHomeDataSchema, 'body'),
  async (req, res, next) => {
    const { id, changingData, restoringData, outdatingData, deletingData } = req.body;

    try {
      const result = await withTransaction(async (t) => {
        const home = await Home.findByPk(id, { transaction: t });
        if (!home) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);
        // CHANGES
        // main
        if (changingData?.main) {
          console.log('changes?.main', changingData?.main);
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Home.update(
              payload,
              {
                where: { id },
                transaction: t,
                individualHooks: true
              });
          }
          if (changingData.main.isClose === true) {
            await HomeCoordination.update(
              { isRestricted: true, isRecoverable: false },
              {
                where: { homeId: id },
                individualHooks: true,
                transaction: t,
              }
            );
          }
          if (changingData.main.isClose === false) {
            await HomeCoordination.update(
              { isRecoverable: true },
              {
                where: { homeId: id },
                individualHooks: true,
                transaction: t,
              }
            );
          }
        }

        //addresses, contacts, outdated
        await applyOwnerUpdates(
          'home',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          t
        );

        // UPDATED HOME
        const fresh = await Home.findOne({
          where: { id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: includes,
          transaction: t,
        });

        // SEARCH
        const search = createSearchStringFor('home', fresh);
        await HomeSearch.update(
          { content: search },
          { where: { homeId: id, isRestricted: false }, individualHooks: true, transaction: t }
        );
        const outdatedSearch = createOutdatedSearchStringFor('home', fresh);
        if (outdatedSearch) {
          const [row, created] = await HomeSearch.findOrCreate({
            where: { homeId: id, isRestricted: true },
            defaults: { content: outdatedSearch },
            transaction: t
          });
          if (!created) await row.update({ content: outdatedSearch }, { individualHooks: true, transaction: t });
        }
        return transformOwnerData('home', fresh.toJSON());
      });
      console.log('HOME');
      console.dir(result, { depth: null });
      res.status(200).send({ code: 'HOME.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_UPDATED';
      next(error);
    }
  }
);

// API get homes

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
      } = req.body; // already validated by Zod

      const includeOutdated = !!view?.includeOutdated; // false => only actual
      const order = buildOrderFor('home', sort);

      // ---- base where (Home) ----
      const whereHome = {};
      const whereAddress = {};
      const whereContact = {};
      const wherePartner = {};
      const whereUpdateDate = {};


      // view option (if you still use it)
      switch (view?.option) {
        case 'only-active': whereHome.isRestricted = false; break;
        case 'only-blocked': whereHome.isRestricted = true; break;
        default:              /* 'all' or undefined */        break;
      }

      // general filters

      if (filters?.general?.comment !== undefined) {
        whereHome.comment = !filters.general.comment ? null : { [Op.not]: null };
      }
      if (filters?.general?.infoNote !== undefined) {
        whereHome.infoNote = !filters.general.infoNote ? null : { [Op.not]: null };
      }
      if (filters?.general?.noAddress !== undefined) {
        whereHome.noAddress = !filters.general.noAddress ? null : { [Op.not]: null };
      }
      if (filters?.general?.specialHome !== undefined) {
        whereHome.specialHome = !filters.general.specialHome ? null : { [Op.not]: null };
      }
      if (filters?.general?.acceptableForSchool !== undefined) {
        whereHome.acceptableForSchool = !filters.general.acceptableForSchool ? null : { [Op.not]: null };
      }
      if (filters?.general?.isClose !== undefined) {
        whereHome.isClose = filters.general.isClose;;
      }
      if (filters?.general?.hasCoordinators !== undefined) {
        whereHome.hasCoordinators = !filters.general.hasCoordinators ? null : { [Op.not]: null };
      }

      if (filters?.general?.dateBeginningRange) {
        whereHome.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereHome.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }
      //TODO: проверить правильно ли выставлены эти параметры. м.б. вообще всегда достаточно false
      const coordRequired = filters?.general?.hasPartners == undefined || filters?.general?.hasPartners == false ? false : true;


      //TODO: noAddress specialHome acceptableForSchool infoNote dateUpdateRange, hasCoordinators, status, dateOfClose

      // contact types filter (weak/strong)
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = buildContactOwnerIdSubquery('home', contactTypes, includeOutdated ? true : false, !!filters?.mode?.strictContact);
        if (!includeOutdated) whereContact.isRestricted = false;
        if (sub) whereContact.homeId = { [Op.in]: sub };
      }

      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = (addresses.countries?.length ?? 0) > 0;
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery('home', addresses, includeOutdated ? true : false, !!filters?.mode?.strictAddress);
        if (!includeOutdated) whereAddress.isRestricted = false;
        if (sub) whereAddress.homeId = { [Op.in]: sub };
      }

      // partners filter
      const partners = filters?.general?.partners || [];
      const partnersRequired = (partners.length ?? 0) > 0;
      if (partnersRequired) {
        if (!includeOutdated) wherePartner.isRestricted = false;
        wherePartner.partnerId = { [Op.in]: partners };
      }

      // dateOfLastUpdate filter
      const dates = filters?.general?.dateUpdateRange || [];
      const datesRequired = (dates.length ?? 0) > 0;
      if (datesRequired) {
        whereUpdateDate.date = betweenDatesInclusive(filters.general.dateUpdateRange);
      }


      // ---- includes (contacts / addresses / outdated names / search) ----
      const includes = [
        {
          model: HomeContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact
        },
        {
          model: HomeAddress,
          as: 'addresses',
          required: addrRequired,
          attributes: [
            'id', 'isRestricted', 'isRecoverable', 'postalName', 'postalCode', 'postalAddressPart', 'fullPostalAddress'],

          where: whereAddress,
          include: [
            { model: Country, attributes: ['id', 'name'] },
            { model: Region, attributes: ['id', 'shortName'] },
            { model: District, attributes: ['id', 'shortName'] },
            { model: Locality, attributes: ['id', 'shortName'] },
          ]
        },
        {
          model: HomeOutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'officialName'],
          //separate: true,
        },
        {
          model: HomeCoordination,
          as: 'coordinations',
          attributes: ['id', 'partnerId', 'homeId', 'isRecoverable', 'isRestricted'],
          required: coordRequired,
          where: !includeOutdated ? { isRestricted: false } : {},
          include: [
            {
              model: Partner,
              as: 'partner',
              where: wherePartner,
              required: partnersRequired,
              attributes: ['firstName', 'patronymic', 'lastName'],
              include: [
                {
                  model: PartnerContact,
                  as: 'contacts',
                  where: { isRestricted: false },
                  attributes: ['id', 'type', 'content', 'isRestricted'],
                  required: false,//TODO: partnersRequired???
                },
              ]
            }
          ]
        },
        {
          model: HomeUpdateDate,
          as: 'updateDates',
          attributes: ['date'],
          where: whereUpdateDate,
          required: datesRequired,
          separate: true,
          order: [['date', 'DESC']],
          limit: 1,
        },
      ];
      //order by region.shortName
      if (sort?.[0]?.field === 'regionName') {
        includes.push({
          model: HomeAddress,
          as: 'activeAddress',
          attributes: [],
          required: false,
          include: [{ model: Region, as: 'region', attributes: [], }],
        });
      }

      // search by HomeSearch.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: HomeSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          }
        });
      }

      // ---- count (distinct) ----
      const total = await Home.count({
        where: whereHome,
        include: includes,
        distinct: true,
      });

      //console.log('whereHome', whereHome);
      //console.log('ORDER', order);
      /*  console.log('includes', includes);
       console.log('whereHome', whereHome); */

      // ---- page ----
      const homes = await Home.findAll({
        where: whereHome,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        // subQuery: false, // avoid subquery limits in includes
        // subQuery: false,//TODO: delete????
        distinct: true,
      });
      //console.log('HOMEs', JSON.stringify(homes));
      const items = homes.map(p => transformOwnerData('home', p.toJSON()));
      //console.log('HOMEs-2', JSON.stringify(items));

      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.LIST_FAILED';
      next(error);
    }
  }
);

router.get("/get-home-by-id/:id",
  requireAuth,
  requireAny('VIEW_HOME', 'EDIT_HOME'),
  validateRequest(homeSchemas.homeIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const home = await Home.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: includes,
      });
      if (!home) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);
      const data = transformOwnerData('home', home.toJSON());
      //console.log('HOME', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_FOUND';
      next(error);
    }
  });

router.get("/get-list-of-homes",
  requireAuth,
  requireAny('VIEW_PARTNER', 'EDIT_PARTNER', 'ADD_PARTNER'),
  async (req, res, next) => {
    try {
      const homes = await Home.findAll({
        attributes: ['id', 'homeName'],
        where: { isRestricted: false, isClose: false },
        include: [{
          model: HomeAddress,
          as: 'addresses',
          attributes: ['id'],
          where: { isRestricted: false },
          include: [
            { model: Region, attributes: ['shortName'] }
          ]
        },],
      });

      // console.log('HOMEs', JSON.stringify(homes));

      const data = homes.map(h => ({ id: h.id, name: (h.homeName + ' - ' + h.addresses[0].region.shortName) }));
      // console.log('HOMES', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.LIST_FAILED';
      next(error);
    }
  });

router.get(
  "/check-home-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_HOME'),
  validateRequest(homeSchemas.homeIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const home = await Home.findByPk(id);
      if (!home) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);

      //TODO: find does this home has seniors, partners
      const [countSeniors, countPartners] = await Promise.all([
    /*     Senior.count({
          where: { homeId: id }
        }), */
        Partner.count({
          where: { homeId: id }
        })
      ]);
      const count = (countSeniors ?? 0) + (countPartners ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'HOME.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_CHECKED';
      next(error);
    }
  });

router.delete(
  "/delete-home/:id",
  requireAuth,
  requireOperation('DELETE_HOME'),
  validateRequest(homeSchemas.homeIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        // 1) Ensure the home exists
        const home = await Home.findByPk(id, { transaction: t });
        if (!home) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);

        // 2) Delete the home (DB will cascade child tables)
        const destroyed = await Home.destroy({
          where: { id },
          transaction: t,
          individualHooks: true, // will run home-level hooks; children won't fire via DB cascade
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'HOME.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_DELETED';
      next(error);
    }
  });

/* router.get(
  "/check-home-before-block/:id",
  requireAuth,
  requireOperation('BLOCK_HOME'),
  validateRequest(homeSchemas.homeIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const home = await Home.findByPk(id);
      if (!home) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);


      ]);
      const count = (countHouses ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'HOME.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_CHECKED';
      next(error);
    }
  }); */

router.patch(
  '/block-home',
  requireAuth,
  requireAny('BLOCK_HOME'),
  validateRequest(homeSchemas.homeBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (t) => {
        // 1) Block the home
        const [affected] = await Home.update(
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
          throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'HOME.BLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_BLOCKED';
      next(error);
    }
  }
);

router.patch(
  "/unblock-home",
  requireAuth,
  requireAny('UNBLOCK_HOME'),
  validateRequest(homeSchemas.homeIdSchema, 'body'),
  async (req, res, next) => {
    try {
      let id = req.body.id;
      const [affected] = await Home.update(
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
        throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);
      }
      res.status(200).send({ code: 'HOME.UNBLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.HOME.NOT_UNBLOCKED';
      next(error);
    }
  });
export default router;
