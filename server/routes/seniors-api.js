import { Router } from "express";
import { Op } from 'sequelize';
import { z } from 'zod';
import {
  Country, Region, District, Locality, Home,
  Role, SeniorAddress, Senior, SeniorContact, SeniorSearch, SeniorOutdatedName, HomeCoordination,
  HomeAddress
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as seniorSchemas from "../../shared/dist/senior.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { collectFlatContacts, findDuplicateContacts, fullName, saveOwnerContactsAndAddress } from "../controllers/ctrl-create-owner-contacts-address.js";
import { createSearchStringFor, createOutdatedSearchStringFor } from "../controllers/ctrl-search-string.js";
import { betweenDatesInclusive, buildAddressOwnerIdSubquery, buildContactOwnerIdSubquery, buildOrderFor, buildSearchContentWhere } from "../controllers/ctrl-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";

const router = Router();
const includes = [
  {
    model: Home,
    as: 'home',
    attributes: ['homeName'],
    include: [
      {
        model: HomeAddress,
        as: 'addresses',
        attributes: ['id', 'fullPostalAddress', 'isRestricted'],
        where: { isRestricted: false },
        include: [
          { model: Country, attributes: ['id', 'name'] },
          { model: Region, attributes: ['id', 'shortName', 'name'] },
          { model: District, attributes: ['id', 'shortName', 'name'] },
          { model: Locality, attributes: ['id', 'shortName', 'name'] },
        ]
      }
    ]
  },
  {
    model: SeniorOutdatedName,
    as: 'outdatedNames',
    attributes: ['id', 'firstName', 'patronymic', 'lastName']
  },
  {
    model: Senior,
    as: 'spouse',
    attributes: ['id', 'firstName', 'patronymic', 'lastName']
  }
];

// API create senior

router.post(
  "/check-senior-data",
  requireAuth,
  requireAny('ADD_NEW_SENIOR', 'EDIT_SENIOR'),
  validateRequest(seniorSchemas.checkSeniorDataSchema, "body"),
  async (req, res, next) => {
    try {
      let senior = req.body;
      const excludeSelf = senior.id ? { id: { [Op.ne]: senior.id } } : {};

      const whereClause = {
        ...excludeSelf,
        homeId: senior.homeId,
        firstName: { [Op.iLike]: senior.firstName }, // имя обязательно
      };

      whereClause.patronymic = senior.patronymic == null
        ? { [Op.is]: null }
        : { [Op.iLike]: senior.patronymic };

      whereClause.lastName = senior.lastName == null
        ? { [Op.is]: null }
        : { [Op.iLike]: senior.lastName };

      whereClause.birthDate = senior.birthDate == null
        ? { [Op.is]: null }
        : senior.birthDate;

      const nameRows = await Senior.findAll({
        where: whereClause,
        attributes: ['firstName', 'patronymic', 'lastName', 'birthDate'],
        raw: true
      });
      const duplicatesName = nameRows.map(row => fullName(row) + row.birthDate ? (' ' + row.birthDate) : '');

      let response = { data: { duplicatesName } };
      if (duplicatesName.length > 0) response.code = 'SENIOR.HAS_DATA_DUPLICATES';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.DUPLICATES_NOT_CHECKED';
      next(error);
    }
  });

router.post(
  '/create-senior',
  requireAuth,
  requireOperation('ADD_NEW_SENIOR'),
  validateRequest(seniorSchemas.seniorDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingSenior = req.body;

      //console.log('creatingSenior', creatingSenior)

      const result = await withTransaction(async (t) => {

        const senior = await Senior.create(
          {
            firstName: creatingSenior.firstName,
            patronymic: creatingSenior.patronymic,
            lastName: creatingSenior.lastName,
            comment: creatingSenior.comment,
            isRestricted: creatingSenior.isRestricted,
            causeOfRestriction: creatingSenior.causeOfRestriction,
            dateOfRestriction: creatingSenior.dateOfRestriction,
            birthDate: creatingSenior.birthDate,
            gender: creatingSenior.gender,
            infoNote: creatingSenior.infoNote,
            photoLink: creatingSenior.photoLink,
            dateOfConsent: creatingSenior.dateOfConsent,
            personalNoAddr: creatingSenior.personalNoAddr,
            kindergarten: creatingSenior.kindergarten,
            teacher: creatingSenior.teacher,
            veteran: creatingSenior.veteran,
            childOfWar: creatingSenior.childOfWar,
            profession: creatingSenior.profession,
            honoraryStatus: creatingSenior.honoraryStatus,
            interests: creatingSenior.interests,
            orthodoxBeliever: creatingSenior.orthodoxBeliever,
            dateOfStart: creatingSenior.dateOfStart,
            dateOfExit: creatingSenior.dateOfExit,
          },
          { transaction: t }
        );

        const freshSenior = await Senior.findOne({
          where: { id: senior.id },
          attributes: {
            exclude: [
              'createdAt',
              'updatedAt']
          },
          include: includes,
          transaction: t,
        });

        const searchString = createSearchStringFor('senior', freshSenior);
        await SeniorSearch.create({ seniorId: senior.id, content: searchString }, { transaction: t });

        return fullName(senior);
      });

      res.status(201).send({ code: 'SENIOR.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_CREATED';
      next(error);
    }
  }
);

router.post(
  '/update-senior',
  requireAuth,
  requireOperation('EDIT_SENIOR'),
  validateRequest(seniorSchemas.updateSeniorDataSchema, 'body'),
  async (req, res, next) => {
    const { id, changingData, restoringData, outdatingData, deletingData } = req.body;

    try {
      const result = await withTransaction(async (t) => {
        const senior = await Senior.findByPk(id, { transaction: t });
        if (!senior) throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);
        // CHANGES
        // main
        if (changingData?.main) {
          console.log('changes?.main', changingData?.main);
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Senior.update(
              payload,
              {
                where: { id },
                transaction: t,
                individualHooks: true
              });
          }
        }

        //addresses, contacts, outdated
        await applyOwnerUpdates(
          'senior',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          t
        );

        // UPDATED SENIOR
        const fresh = await Senior.findOne({
          where: { id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: includes,
          transaction: t,
        });

        // SEARCH
        const search = createSearchStringFor('senior', fresh);
        await SeniorSearch.update(
          { content: search },
          { where: { seniorId: id, isRestricted: false }, individualHooks: true, transaction: t }
        );
        const outdatedSearch = createOutdatedSearchStringFor('senior', fresh);
        if (outdatedSearch) {
          const [row, created] = await SeniorSearch.findOrCreate({
            where: { seniorId: id, isRestricted: true },
            defaults: { content: outdatedSearch },
            transaction: t
          });
          if (!created) await row.update({ content: outdatedSearch }, { individualHooks: true, transaction: t });
        }
        return transformOwnerData('senior', fresh.toJSON());
      });
      console.log('SENIOR');
      console.dir(result, { depth: null });
      res.status(200).send({ code: 'SENIOR.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_UPDATED';
      next(error);
    }
  }
);

// API get seniors TODO:

router.post(
  '/get-seniors',
  requireAuth,
  requireAny('VIEW_LIMITED_SENIORS_LIST', 'VIEW_FULL_SENIORS_LIST'),
  validateRequest(seniorSchemas.seniorsQueryDTOSchema, 'body'),
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
      const order = buildOrderFor('senior', sort);

      // ---- base where (Senior) ----
      const whereSenior = {};
      const whereAddress = {};
      const whereHome = {};
      // const whereHomeAddress = {};
      whereHome.isRestricted = false;
      let homesRequired = false;

      // view option (if you still use it)
      switch (view?.option) {
        case 'only-active': whereSenior.isRestricted = false; break;
        case 'only-blocked': whereSenior.isRestricted = true; break;
        default:              /* 'all' or undefined */        break;
      }

      // general filters

      if (filters?.general?.comment !== undefined) {
        whereSenior.comment = !filters.general.comment ? null : { [Op.not]: null };
      }
      if (filters?.general?.dateBeginningRange) {
        whereSenior.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereSenior.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }
      if (filters?.general?.hasConsent !== undefined) {
        whereSenior.dateOfConsent = !filters.general.hasConsent ? null : { [Op.not]: null };
      }

      /* TODO:   dateRange: z.tuple([nullableInt, nullableInt]).optional(),
                  monthRange: z.tuple([nullableInt, nullableInt]).optional(),
                  yearRange: z.tuple([nullableInt, nullableInt]).optional(), */
      // если хоть один фильтр задан — исключаем null birthDate
      const hasAny =
        (filters?.general?.dateRange && (filters?.general?.dateRange[0] != null || filters?.general?.dateRange[1] != null)) ||
        (filters?.general?.monthRange && (filters?.general?.monthRange[0] != null || filters?.general?.monthRange[1] != null)) ||
        (filters?.general?.yearRange && (filters?.general?.yearRange[0] != null || filters?.general?.yearRange[1] != null));

      if (hasAny)
        applyBirthDatePartsFilters(whereSenior, {
          dateRange: filters?.general?.dateRange,
          monthRange: filters?.general?.monthRange,
          yearRange: filters?.general?.yearRange,
        });


      //TODO: проверить
      if (filters?.general?.hasPhotoLink === true) {
        whereSenior.photoLink = { [Op.not]: null };
      }
      if (filters?.general?.hasKindergartenStatus === true) {
        whereSenior.hasKindergartenStatus = { [Op.not]: null };
      }
      if (filters?.general?.hasTeacherStatus === true) {
        whereSenior.hasTeacherStatus = { [Op.not]: null };
      }
      if (filters?.general?.hasHonoraryStatus === true) {
        whereSenior.hasHonoraryStatus = { [Op.not]: null };
      }
      if (filters?.general?.hasVeteranStatus === true) {
        whereSenior.hasVeteranStatus = { [Op.not]: null };
      }
      if (filters?.general?.hasChildOfWarStatus === true) {
        whereSenior.hasChildOfWarStatus = { [Op.not]: null };
      }
      if (filters?.general?.hasOrthodoxBelieverStatus === true) {
        whereSenior.hasOrthodoxBelieverStatus = { [Op.not]: null };
      }
      if (filters?.general?.hasProfession === true) {
        whereSenior.photoLink = { [Op.not]: null };
      }
      if (filters?.general?.hasSpouse === true) {
        whereSpouse['$spouse.id$'] = { [Op.not]: null };
      }

      if (filters?.general?.noAddress !== undefined) {
        whereHome.noAddress = filters.general.noAddress;
        homesRequired = true;
      }
      if (filters?.general?.specialHome !== undefined) {
        whereHome.specialHome = filters.general.specialHome;
        homesRequired = true;
      }
      if (filters?.general?.acceptableForSchool !== undefined) {
        whereHome.acceptableForSchool = filters.general.acceptableForSchool;
        homesRequired = true;
      }

      /*       if (filters?.general?.hasHomes !== undefined) {
              whereSenior['$coordinations.id$'] = !filters.general.hasHomes ? null : { [Op.not]: null };
            }
            if (filters?.general?.affiliations?.length) {
              whereSenior.affiliation = { [Op.in]: filters.general.affiliations };
            } */

      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = (addresses.countries?.length ?? 0) > 0;
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery('senior', addresses, includeOutdated ? true : false, !!filters?.mode?.strictAddress);
        whereAddress.isRestricted = false;
        if (sub) whereAddress.seniorId = { [Op.in]: sub };
      }

      // homes filter
      const homes = filters?.general?.homes || [];
      if ((homes.length ?? 0) > 0) {
        whereHome.homeId = { [Op.in]: homes };
        homesRequired = true;
      }

      // ---- includes (contacts / addresses / coordinations / outdated names / search) ----
      const includes =

        [
          {
            model: Home,
            as: 'home',
            attributes: ['homeName'],
            where: whereHome,
            required: homesRequired,
            include: [
              {
                model: HomeAddress,
                as: 'addresses',
                attributes: ['id', 'fullPostalAddress', 'isRestricted'],
                where: whereAddress,
                required: addrRequired,
                include: [
                  { model: Country, attributes: ['id', 'name'] },
                  { model: Region, attributes: ['id', 'shortName', 'name'] },
                  { model: District, attributes: ['id', 'shortName', 'name'] },
                  { model: Locality, attributes: ['id', 'shortName', 'name'] },
                ]
              }
            ]
          },
          {
            model: SeniorOutdatedName,
            as: 'outdatedNames',
            attributes: ['id', 'firstName', 'patronymic', 'lastName']
          },
          {
            model: Senior,
            as: 'spouse',
            attributes: ['id', 'firstName', 'patronymic', 'lastName'],
            where: whereSpouse
          }
        ];

      // search by SeniorSearch.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: SeniorSearch,
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
      const total = await Senior.count({
        where: whereSenior,
        include: includes,
        distinct: true,
      });

      // console.log('whereSenior', whereSenior);
      // console.log('ORDER', order);
      /*  console.log('includes', includes);
       console.log('whereSenior', whereSenior); */

      // ---- page ----
      const seniors = await Senior.findAll({
        where: whereSenior,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        //subQuery: false, // avoid subquery limits in includes
        distinct: true,
      });
      //  console.log('seniors', seniors);

      const items = seniors.map(p => transformOwnerData('senior', p.toJSON()));
      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.LIST_FAILED';
      next(error);
    }
  }
);

router.get("/get-senior-by-id/:id",
  requireAuth,
  requireAny('VIEW_SENIOR', 'EDIT_SENIOR'),
  validateRequest(seniorSchemas.seniorIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const senior = await Senior.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: includes,
      });
      if (!senior) throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);
      const data = transformOwnerData('senior', senior.toJSON());
      console.log('SENIOR', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_FOUND';
      next(error);
    }
  });

/* router.get("/get-list-of-seniors",
  requireAuth,
  requireAny('VIEW_HOME', 'EDIT_HOME', 'ADD_HOME'),
  async (req, res, next) => {
    try {
      const seniors = await Senior.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        where: { isRestricted: false },
      });

      const data = seniors.map(p => ({ id: p.id, name: fullName(p) }));
      console.log('SENIORS', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.LIST_FAILED';
      next(error);
    }
  }); */

router.get(
  "/check-senior-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_SENIOR'),
  validateRequest(seniorSchemas.seniorIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const senior = await Senior.findByPk(id);
      if (!senior) throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);

      //TODO: find does this senior has orders
      const [countOrders, countSpouse] = await Promise.all([
        /*         Order.count({
                  where: { seniorId: id }
                }),
                Senior.count({
                  where: { spouseId: id }
                }),*/
      ]);
      const count = (countOrders ?? 0) + (countSpouse ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'SENIOR.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_CHECKED';
      next(error);
    }
  });

router.delete(
  "/delete-senior/:id",
  requireAuth,
  requireOperation('DELETE_SENIOR'),
  validateRequest(seniorSchemas.seniorIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        // 1) Ensure the senior exists
        const senior = await Senior.findByPk(id, { transaction: t });
        if (!senior) throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);

        // 2) Delete the senior (DB will cascade child tables)
        const destroyed = await Senior.destroy({
          where: { id },
          transaction: t,
          individualHooks: true, // will run senior-level hooks; children won't fire via DB cascade
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'SENIOR.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_DELETED';
      next(error);
    }
  });

/* router.get(
  "/check-senior-before-block/:id",
  requireAuth,
  requireOperation('BLOCK_SENIOR'),
  validateRequest(seniorSchemas.seniorIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const senior = await Senior.findByPk(id);
      if (!senior) throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);

      const [countHouses] = await Promise.all([
        HomeCoordination.count({
          where: { seniorId: id, isRestricted: false }
        }),
      ]);
      const count = (countHouses ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'SENIOR.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_CHECKED';
      next(error);
    }
  }); */

router.patch(
  '/block-senior',
  requireAuth,
  requireAny('BLOCK_SENIOR'),
  validateRequest(seniorSchemas.seniorBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (t) => {
        // 1) Block the senior
        const [affected] = await Senior.update(
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
          throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'SENIOR.BLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_BLOCKED';
      next(error);
    }
  }
);

router.patch(
  "/unblock-senior",
  requireAuth,
  requireAny('UNBLOCK_SENIOR'),
  validateRequest(seniorSchemas.seniorIdSchema, 'body'),
  async (req, res, next) => {
    try {
      let id = req.body.id;
      const [affected] = await Senior.update(
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
        throw new CustomError('ERRORS.SENIOR.NOT_FOUND', 404);
      }
      res.status(200).send({ code: 'SENIOR.UNBLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_UNBLOCKED';
      next(error);
    }
  });
export default router;
