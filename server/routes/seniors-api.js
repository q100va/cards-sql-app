import { Router } from "express";
import { Op, fn, col, where, literal } from 'sequelize';
import {
  Country, Region, District, Locality, Home,
  Senior, SeniorSearch, SeniorOutdatedName,
  HomeAddress,
  Occasion,
  HomeUpdateDate
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as seniorSchemas from "../../shared/dist/schemas/senior.schema.js";
import * as homeSchemas from "../../shared/dist/schemas/home.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { collectFlatContacts, findDuplicateContacts, fullName, saveOwnerContactsAndAddress } from "../controllers/ctrl-create-owner-contacts-address.js";
import { createSearchStringFor, createOutdatedSearchStringFor } from "../controllers/ctrl-search-string.js";
import { betweenDatesInclusive, buildAddressOwnerIdSubquery, buildContactOwnerIdSubquery, buildOrderFor, buildSearchContentWhere } from "../controllers/ctrl-query-builders.js";
import { applyBirthDatePartsFilters } from "../controllers/ctrl-birth-date-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";
import { z } from 'zod';
import { getPotentialRecipients } from "../controllers/ctrl-generate-recipients.js";
import { editActiveRecipient, editHomeActiveRecipients } from "../controllers/ctrl-edit-recipient.js";
import { compareSeniorLists } from "../controllers/ctrl-compare-seniors-lists.js";
import { addNewSeniors, removeSeniors, updateSeniors } from "../controllers/ctrl-update-seniors-list.js";
import { addRecipients, markAbsentRecipients } from "../controllers/ctrl-check-recipients.js";

const router = Router();
export const INCLUDES = [
  {
    model: Home,
    as: 'home',
    attributes: ['id', 'homeName', 'noAddress', 'specialHome', 'acceptableForSchool',
      'isRestricted', 'dateOfRestriction', 'causeOfRestriction', 'isClose', 'dateOfClose'],
    include: [
      {
        model: HomeAddress,
        as: 'activeAddress',
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
    attributes: ['id', 'firstName', 'patronymic', 'lastName', 'birthDate']
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
        : new Date(senior.birthDate);

      const nameRows = await Senior.findAll({
        where: whereClause,
        attributes: ['firstName', 'patronymic', 'lastName', 'birthDate'],
        raw: true
      });
      const duplicatesName = nameRows.map(row => fullName(row) + (row.birthDate ? (' ' + row.birthDate) : ''));

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
            //dateOfStart: creatingSenior.dateOfStart,
            dateOfExit: creatingSenior.dateOfExit,
            homeId: creatingSenior.homeId,
            spouseId: creatingSenior.spouseId,
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
          include: INCLUDES,
          transaction: t,
        });
        //TODO: упростить кор-ку бывших и определяемых супругов
        if (creatingSenior.spouseId) {
          const exSpouse = await Senior.findOne(
            {
              where: {
                spouseId: creatingSenior.spouseId,
                id: { [Op.ne]: freshSenior.id }
              },
              transaction: t,
            });
          if (exSpouse) {
            await Senior.update(
              { spouseId: null },
              {
                where: { id: exSpouse.id },
                transaction: t,
              });
            const freshExSpouse = await Senior.findOne({
              where: { id: exSpouse.id },
              attributes: {
                exclude: [
                  'createdAt',
                  'updatedAt']
              },
              include: INCLUDES,
              transaction: t,
            });
            const searchString = createSearchStringFor('senior', freshExSpouse);
            await SeniorSearch.create({ seniorId: freshExSpouse.id, content: searchString }, { transaction: t });

          }

          await Senior.update(
            { spouseId: freshSenior.id },
            {
              where: { id: creatingSenior.spouseId },
              transaction: t,
            });
          const freshNewSpouse = await Senior.findOne({
            where: { id: creatingSenior.spouseId },
            attributes: {
              exclude: [
                'createdAt',
                'updatedAt']
            },
            include: INCLUDES,
            transaction: t,
          });
          const searchString = createSearchStringFor('senior', freshNewSpouse);
          await SeniorSearch.create({ seniorId: freshNewSpouse.id, content: searchString }, { transaction: t });
        }

        console.log('freshSenior');
        console.log(JSON.stringify(freshSenior, null, 2));

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

          const spouseId = changingData.main.spouseId;
          if (spouseId !== undefined) {

            if (senior.spouseId) {
              await Senior.update(
                { spouseId: null },
                {
                  where: { id: senior.spouseId },
                  transaction: t
                }
              );
              const freshExSpouse = await Senior.findOne({
                where: { id: senior.spouseId },
                attributes: {
                  exclude: [
                    'createdAt',
                    'updatedAt']
                },
                include: INCLUDES,
                transaction: t,
              });
              const searchString = createSearchStringFor('senior', freshExSpouse);
              await SeniorSearch.create({ seniorId: freshExSpouse.id, content: searchString }, { transaction: t });
            }

            if (spouseId !== null) {
              const exSpouse = await Senior.findOne(
                {
                  where: {
                    spouseId: spouseId,
                    id: { [Op.ne]: id }
                  },
                  transaction: t,
                });
              if (exSpouse) {
                await Senior.update(
                  { spouseId: null },
                  {
                    where: { id: exSpouse.id },
                    transaction: t,
                  });
                const freshExSpouse = await Senior.findOne({
                  where: { id: exSpouse.id },
                  attributes: {
                    exclude: [
                      'createdAt',
                      'updatedAt']
                  },
                  include: INCLUDES,
                  transaction: t,
                });
                const searchString = createSearchStringFor('senior', freshExSpouse);
                await SeniorSearch.create({ seniorId: freshExSpouse.id, content: searchString }, { transaction: t });
              }

              await Senior.update(
                { spouseId: id },
                {
                  where: { id: spouseId },
                  transaction: t
                }
              );

              const freshNewSpouse = await Senior.findOne({
                where: { id: spouseId },
                attributes: {
                  exclude: [
                    'createdAt',
                    'updatedAt']
                },
                include: INCLUDES,
                transaction: t,
              });
              const searchString = createSearchStringFor('senior', freshNewSpouse);
              await SeniorSearch.create({ seniorId: freshNewSpouse.id, content: searchString }, { transaction: t });
            }
          }

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
            await editActiveRecipient(id, payload, t);
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
          include: INCLUDES,
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

// API get seniors

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
      /*       console.log('ORDER');
            console.log(JSON.stringify(order, null, 2)); */

      // ---- base where (Senior) ----
      const whereSenior = {};
      const whereAddress = {};
      const whereHome = {};
      // const whereSpouse = {};
      // const whereHomeAddress = {};
      //whereHome.isRestricted = false;
      whereAddress.isRestricted = false;
      let homesRequired = true;
      let spouseRequired = false;

      // проверять еще и по интернату:участвует/не участвует но с условием ИЛИ для only-blocked
      //и когда жилец выбывает нужно блокировать его

      // view option (if you still use it)

      switch (view?.homeOption) {
        case 'only-active': whereHome.isRestricted = false; break;
        case 'only-blocked': whereHome.isRestricted = true; whereHome.isClose = false; break;
        case 'only-closed': whereHome.isClose = true; break;
        case 'exclude-closed': whereHome.isClose = false; break;
        default:      /* 'all' or undefined */    break;
      }


      if (view?.homeOption !== 'only-closed') {
        switch (view?.option) {
          case 'only-active': {
            whereSenior.isRestricted = false;
            break;
          }
          case 'only-blocked': {
            whereSenior.isRestricted = true;
            whereSenior.dateOfExit = null;
            break;
          }
          case 'only-discharged': {
            whereSenior.dateOfExit = { [Op.not]: null };
            break;
          }
          case 'exclude-discharged': {
            whereSenior.dateOfExit = null;
            break;
          }

          default:              /* 'all' or undefined */        break;
        }
      }

      // general filters

      if (filters?.general?.dateBeginningRange) {
        whereSenior.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereSenior.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }
      if (filters?.general?.dateExitRange) {
        whereSenior.dateOfExit = betweenDatesInclusive(filters.general.dateExitRange);
      }

      // если хоть один фильтр задан — исключаем null birthDate
      const hasAny =
        (filters?.general?.dayRange && (filters?.general?.dayRange[0] != null || filters?.general?.dayRange[1] != null)) ||
        (filters?.general?.monthRange && (filters?.general?.monthRange[0] != null || filters?.general?.monthRange[1] != null)) ||
        (filters?.general?.yearRange && (filters?.general?.yearRange[0] != null || filters?.general?.yearRange[1] != null));

      if (hasAny) {
        applyBirthDatePartsFilters(whereSenior, filters?.general?.hideWithoutYear ?? false, {
          dayRange: filters?.general?.dayRange,
          monthRange: filters?.general?.monthRange,
          yearRange: filters?.general?.yearRange,
        });
      }
      if (filters?.general?.hideWithoutYear && !hasAny) {
        whereSenior.birthDate = {
          [Op.and]: [
            where(fn('DATE_PART', 'year', col('senior.birthDate')), { [Op.not]: 1800 }),
            { [Op.not]: null },
          ],
        };
      }
      if (filters?.general?.hideWithoutBirthday && !hasAny && !filters?.general?.hideWithoutYear) {
        whereSenior.birthDate = { [Op.not]: null };
      }

      /*       console.log('WHERESENIOR');
            console.log(JSON.stringify(whereSenior, null, 2)); */

      if (filters?.general?.noAddress === true || filters?.general?.noAddress === false) {
        whereHome.noAddress = filters.general.noAddress;
        homesRequired = true;
      }
      if (filters?.general?.specialHome === true || filters?.general?.specialHome === false) {
        whereHome.specialHome = filters.general.specialHome;
        homesRequired = true;
      }
      if (filters?.general?.acceptableForSchool === true || filters?.general?.acceptableForSchool === false) {
        whereHome.acceptableForSchool = filters.general.acceptableForSchool;
        homesRequired = true;
      }
      if (filters?.general?.gender) {
        whereSenior.gender = filters.general.gender;
      }


      const details = filters?.general?.details || [];
      if (details.length > 0) {
        const strict = !!filters?.mode?.strictDetail;
        if (strict) whereSenior[Op.and] = details.map(detail => ({
          [detail]: detail !== 'personalNoAddr' ? { [Op.not]: null } : true
        }));
        if (!strict) whereSenior[Op.or] = details.map(detail => ({
          [detail]: detail !== 'personalNoAddr' ? { [Op.not]: null } : true
        }));
      }


      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = (addresses.countries?.length ?? 0) > 0;
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery('senior', addresses, false, false);
        //whereAddress.isRestricted = false;

        if (sub) whereHome.id = { [Op.in]: sub };
      }

      // homes filter
      const homes = filters?.general?.homes || [];
      if (homes.length > 0) {
        if (whereHome.id) {
          whereHome.id = {
            [Op.and]: [
              whereHome.id,
              { [Op.in]: homes }
            ]
          };
        } else {
          whereHome.id = { [Op.in]: homes };
        }
        homesRequired = true;
      }

      // ---- INCLUDES (contacts / addresses / coordinations / outdated names / search) ----
      const INCLUDES =

        [
          {
            model: Home,
            as: 'home',
            attributes: ['id', 'homeName', 'noAddress', 'specialHome', 'acceptableForSchool',
              'isRestricted', 'dateOfRestriction', 'causeOfRestriction', 'isClose', 'dateOfClose'],
            where: whereHome,
            required: homesRequired,
            include: [
              {
                model: HomeAddress,
                as: 'activeAddress',
                attributes: [
                  'id',
                  'fullPostalAddress',
                  'isRestricted',
                  'countryId',
                  'regionId',
                  'districtId',
                  'localityId',],
                where: whereAddress,
                required: addrRequired,
                include: [
                  { model: Country, attributes: ['id', 'name'] },
                  { model: Region, attributes: ['id', 'shortName', 'name'] },
                  { model: District, attributes: ['id', 'shortName', 'name'] },
                  { model: Locality, attributes: ['id', 'shortName', 'name'] },
                ]
              }/* ,
              {
                model: HomeAddress,
                as: 'activeAddress',
                attributes: [],
                required: false,
                include: [{ model: Region, as: 'region', attributes: [], }],
              } */
            ]
          },
          {
            model: SeniorOutdatedName,
            as: 'outdatedNames',
            attributes: ['id', 'firstName', 'patronymic', 'lastName'],
            required: false
          },
          {
            model: Senior,
            as: 'spouse',
            attributes: ['id', 'firstName', 'patronymic', 'lastName'],
            // where: whereSpouse,
            required: spouseRequired
          }
        ];

      // search by SeniorSearch.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        INCLUDES.push({
          model: SeniorSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          }
        });
      }
      /*       console.log('INCLUDES');
            console.log(JSON.stringify(INCLUDES, null, 2)); */

      //order by region.shortName
      /*      if (sort?.[0]?.field === 'regionName') {
             INCLUDES.push({
               model: HomeAddress,
               as: 'activeAddress',
               attributes: [],
               required: false,
               include: [{ model: Region, as: 'region', attributes: [], }],
             });
           } */


      // ---- count (distinct) ----
      const total = await Senior.count({
        where: whereSenior,
        include: INCLUDES,
        distinct: true,
      });

      // console.log('whereSenior', whereSenior);
      // console.log('ORDER', order);
      /*  console.log('INCLUDES', INCLUDES);
       console.log('whereSenior', whereSenior); */

      // ---- page ----
      const seniors = await Senior.findAll({
        where: whereSenior,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: INCLUDES,
        offset: pageSize * pageNumber,
        limit: pageSize,
        //  subQuery: false, // avoid subquery limits in INCLUDES
        //  distinct: true,
      });
      // console.log('seniors', seniors);
      console.log('SENIORS');
      console.log(JSON.stringify(seniors, null, 2));
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
        include: INCLUDES,
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

//TODO: исключать самого сеньора (из списка для выбора супруга)
router.get("/get-list-of-seniors/:id",
  requireAuth,
  requireAny('VIEW_SENIOR', 'EDIT_SENIOR', 'ADD_NEW_SENIOR'),
  validateRequest(homeSchemas.homeIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const seniors = await Senior.findAll({
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        where: { dateOfExit: null, homeId: req.params.id },
      });

      const data = seniors.map(p => ({ id: p.id, name: fullName(p) }));
      console.log('SENIORS', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.LIST_FAILED';
      next(error);
    }
  });

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

      //TODO: find does this senior has recipients
      const [countRecipients, countSpouse] = await Promise.all([
        Recipient.count({
          where: { seniorId: id }
        }),
        Senior.count({
          where: { spouseId: id }
        }),
      ]);
      const count = (countRecipients ?? 0) + (countSpouse ?? 0);
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
        await editActiveRecipient(id, { isRestricted: true }, t);
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
      await withTransaction(async (t) => {
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
        await editActiveRecipient(id, { isRestricted: false }, t);
      });

      res.status(200).send({ code: 'SENIOR.UNBLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.NOT_UNBLOCKED';
      next(error);
    }
  });

router.get("/get-seniors-for-occasion/:occasionId/:homeId",
  requireAuth,
  requireAny('ADD_NEW_RECIPIENT'),
  validateRequest(z.object({
    occasionId: z.coerce.number().int().positive(),
    homeId: z.coerce.number().int().positive(),
  }), 'params'),
  async (req, res, next) => {
    try {

      const occasionId = req.params.occasionId;
      const occasion = await Occasion.findByPk(occasionId);
      if (!occasion) throw new CustomError('ERRORS.OCCASION.NOT_FOUND', 404);

      const homeId = req.params.homeId;
      const data = await getPotentialRecipients(occasion, homeId);
      console.log('SENIORS', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.LIST_FAILED';
      next(error);
    }
  });

router.post(
  "/compare-seniors-lists",
  requireAuth,
  requireAny('UPLOAD_LIST_OF_SENIORS',),
  validateRequest(z.object(
    {
      newList: z.array(seniorSchemas.seniorPreSchema),
      homeName: z.string().trim().min(1),
      commentsMode: z.boolean(),
      chosenMonths: z.array(z.number()),
    }
  ), "body"),
  async (req, res, next) => {
    try {
      const { newList, homeName, commentsMode, chosenMonths } = req.body;
      const home = await Home.findOne({
        where: { homeName }
      });
      if (!home) throw new CustomError('ERRORS.HOME.NOT_FOUND', 404);
      const seniorWhere = {
        homeId: home.id,
      };

      if (chosenMonths.length) {
        seniorWhere[Op.and] = [
          where(fn('EXTRACT', literal('MONTH FROM "birthDate"')), {
            [Op.in]: chosenMonths,
          }),
        ];
      }
      const oldList = await Senior.findAll({
        where: seniorWhere
      });
      const differences = compareSeniorLists(newList, oldList, home.id, commentsMode);
      console.log('differences', differences);
      res
        .status(200)
        .send({ code: 'SENIOR.COMPARED', data: { differences, homeId: home.id } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.LISTS_NOT_COMPARED';
      next(error);
    }
  });

router.post(
  '/update-seniors-list/',
  requireAuth,
  requireOperation('UPLOAD_LIST_OF_SENIORS'),
  validateRequest(seniorSchemas.bulkUpdateSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('/update-seniors-list/');
      const { admitted, removed, updated, homeId, dateOfUpdate, userId } = req.body;

      //console.log('creatingSenior', creatingSenior)


      const result = await withTransaction(async (t) => {
        const createdCount = await addNewSeniors(admitted, dateOfUpdate, t);
        const removedCount = await removeSeniors(removed, dateOfUpdate, t);
        const updatedCount = await updateSeniors(updated, t);
        const activeOccasions = await Occasion.findAll({
          where: { status: 1 },
          attributes: {
            exclude: [
              'createdAt',
              'updatedAt']
          },
          transaction: t,
        });
        for (let occ of activeOccasions) {
          await addRecipients(occ, t, homeId);
          await markAbsentRecipients(occ, t, homeId);
        }
        for (let s of updated) {
          if (s.changes.lastName !== undefined ||
            s.changes.firstName !== undefined ||
            s.changes.patronymic !== undefined ||
            s.changes.gender !== undefined ||
            s.changes.birthDate !== undefined
          ) {
            await editActiveRecipient(s.seniorId, s.changes, t);
          }
        }
        await HomeUpdateDate.update(
          {
            isLatest: false
          },
          {
            where: {
              homeId,
              isLatest: true
            }
          }
        )

        await HomeUpdateDate.create(
          {
            date: dateOfUpdate,
            homeId,
            userId: req.user.id,
            isLatest: true
          }
        )
        return { createdCount, removedCount, updatedCount }

      });

      res.status(201).send({ code: 'SENIOR.BULK_UPDATE.LIST_UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.SENIOR.LIST_NOT_UPDATED';
      next(error);
    }
  }
);


export default router;

//TODO: задвоение сеньоров в разных домах
