import { Router } from "express";
import { Op, Sequelize } from 'sequelize';
import {
  Country, Region, District, Locality,
  VolunteerAddress, Volunteer, VolunteerContact, VolunteerSearch, VolunteerOutdatedName,
  VolunteerSubscription, VolunteerCooperation, Institute,
  User
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as volunteerSchemas from "../../shared/dist/schemas/volunteer.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { collectFlatContacts, findDuplicateContacts, fullName, saveOwnerContactsAndAddress } from "../controllers/ctrl-create-owner-contacts-address.js";
import { createSearchStringFor, createOutdatedSearchStringFor } from "../controllers/ctrl-search-string.js";
import { betweenDatesInclusive, buildAddressOwnerIdSubquery, buildContactOwnerIdSubquery, buildOrderFor, buildSearchContentWhere } from "../controllers/ctrl-owner-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";
import z from "zod";

const router = Router();

// API create volunteer

router.post(
  "/check-volunteer-data",
  requireAuth,
  requireAny('ADD_NEW_VOLUNTEER', 'EDIT_VOLUNTEER'),
  validateRequest(volunteerSchemas.checkVolunteerDataSchema, "body"),
  async (req, res, next) => {
    try {
      let volunteer = req.body;
      const excludeSelf = volunteer.id ? { id: { [Op.ne]: volunteer.id } } : {};

      const nameRows = volunteer.lastName ? await Volunteer.findAll({
        where: {
          ...excludeSelf,
          firstName: { [Op.iLike]: volunteer.firstName },
          lastName: { [Op.iLike]: volunteer.lastName },
        },
        attributes: ['firstName', 'patronymic', 'lastName'],
        raw: true
      }) : [];
      const duplicatesName = nameRows.map(row => fullName(row));

      const flat = collectFlatContacts(volunteer.contacts);
      const duplicatesContact = await findDuplicateContacts({
        ownerKind: 'volunteer',
        models: { Volunteer, VolunteerContact },
        excludeSelf: volunteer.id ? { id: { [Op.ne]: volunteer.id } } : {},
        flatContacts: flat,
      });

      let response = { data: { duplicatesName, duplicatesContact } };
      if (duplicatesName.length > 0 || duplicatesContact.length > 0) response.code = 'VOLUNTEER.HAS_DATA_DUPLICATES';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.DUPLICATES_NOT_CHECKED';
      next(error);
    }
  });

router.post(
  '/create-volunteer',
  requireAuth,
  requireOperation('ADD_NEW_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingVolunteer = req.body;

      //console.log('creatingVolunteer', creatingVolunteer)

      const result = await withTransaction(async (t) => {

        const volunteer = await Volunteer.create(
          {
            firstName: creatingVolunteer.firstName,
            patronymic: creatingVolunteer.patronymic,
            lastName: creatingVolunteer.lastName,
            comment: creatingVolunteer.comment,
            isRestricted: creatingVolunteer.isRestricted,
            causeOfRestriction: creatingVolunteer.causeOfRestriction,
            dateOfRestriction: creatingVolunteer.dateOfRestriction,
          },
          { transaction: t }
        );

        await saveOwnerContactsAndAddress(
          'volunteer',
          volunteer,
          creatingVolunteer, // { draftContacts, draftAddress }
          { VolunteerContact, VolunteerAddress },
          t
        );

        if ((creatingVolunteer.draftInstitutes ?? []).length) {
          console.log("INSTITUTES", creatingVolunteer.draftInstitutes)
          /*           creatingVolunteer.draftInstitutes.forEach(async i =>
                      await Institute.create(
                        {
                          instituteName: i.instituteName,
                          category: i.category,
                          volunteerId: volunteer.id
                        },
                    { transaction: t }
                      )
                    ) */
          await Institute.bulkCreate(
            creatingVolunteer.draftInstitutes.map((i) => ({
              instituteName: i.instituteName,
              category: i.category,
              volunteerId: volunteer.id,
            })),
            {
              transaction: t,
              individualHooks: true,
            }
          );
        }

        if ((creatingVolunteer.draftSubscriptions ?? []).length) {

          await VolunteerSubscription.bulkCreate(
            creatingVolunteer.draftSubscriptions.map((id) => ({
              volunteerId: volunteer.id,
              userId: id
            })),
            {
              transaction: t,
              individualHooks: true,
            }
          );
        }

        if ((creatingVolunteer.draftCooperations ?? []).length) {
          await VolunteerCooperation.bulkCreate(
            creatingVolunteer.draftCooperations.map((id) => ({
              volunteerId: volunteer.id,
              userId: id
            })),
            {
              transaction: t,
              individualHooks: true,
            }
          );
        }

        const freshVolunteer = await Volunteer.findOne({
          where: { id: volunteer.id },
          attributes: {
            exclude: [
              'createdAt',
              'updatedAt']
          },
          include: [
            {
              model: VolunteerContact,
              as: 'contacts',
              attributes: ['content', 'isRestricted'],
            },
            {
              model: VolunteerAddress,
              as: 'addresses',
              attributes: ['isRestricted'],
              include: [
                { model: Country, attributes: ['name'] },
                { model: Region, attributes: ['name'] },
                { model: District, attributes: ['name'] },
                { model: Locality, attributes: ['name'] },
              ],
            },
            {
              model: Institute,
              as: 'institutes',
              attributes: ['id', 'instituteName', 'category', 'isRestricted', 'isDeletable'],
            },
            {
              model: VolunteerSubscription,
              as: 'subscriptions',
              attributes: ['id', 'userId'],
              include: [
                {
                  model: User, as: 'user', attributes: [
                    'id',
                    'userName',
                    'firstName',
                    'patronymic',
                    'lastName',
                    'isRestricted']
                },
              ]
            },
            {
              model: VolunteerCooperation,
              as: 'cooperations',
              attributes: ['id', 'userId'],
              include: [
                {
                  model: User, as: 'user', attributes: [
                    'id',
                    'userName',
                    'firstName',
                    'patronymic',
                    'lastName',
                    'isRestricted']
                },
              ]
            }
            //TODO: DateOfLastOrder

          ],
          transaction: t,
        });

        const searchString = createSearchStringFor('volunteer', freshVolunteer);
        await VolunteerSearch.create({ volunteerId: volunteer.id, content: searchString }, { transaction: t });

        return fullName(volunteer);
      });

      res.status(201).send({ code: 'VOLUNTEER.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_CREATED';
      next(error);
    }
  }
);

router.post(
  '/update-volunteer',
  requireAuth,
  requireOperation('EDIT_VOLUNTEER'),
  validateRequest(volunteerSchemas.updateVolunteerDataSchema, 'body'),
  async (req, res, next) => {
    const { id, changingData, restoringData, outdatingData, deletingData } = req.body;

    try {
      const result = await withTransaction(async (t) => {
        const volunteer = await Volunteer.findByPk(id, { transaction: t });
        if (!volunteer) throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);
        // CHANGES
        // main
        if (changingData?.main) {
          console.log('changes?.main', changingData?.main);
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Volunteer.update(
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
          'volunteer',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          t
        );

        // UPDATED VOLUNTEER
        const fresh = await Volunteer.findOne({
          where: { id },
          attributes: { exclude: ['createdAt', 'updatedAt'] },
          include: [
            { model: VolunteerContact, as: 'contacts', attributes: ['id', 'type', 'content', 'isRestricted'] },
            {
              model: VolunteerAddress, as: 'addresses', attributes: ['id', 'isRestricted', 'isRecoverable'],
              include: [
                { model: Country, attributes: ['id', 'name'] },
                { model: Region, attributes: ['id', 'shortName', 'name'] },
                { model: District, attributes: ['id', 'shortName', 'name'] },
                { model: Locality, attributes: ['id', 'shortName', 'name'] },
              ]
            },
            { model: VolunteerOutdatedName, as: 'outdatedNames', attributes: ['id', 'firstName', 'patronymic', 'lastName'] },

            {
              model: Institute,
              as: 'institutes',
              attributes: ['id', 'instituteName', 'category', 'isRestricted', 'isDeletable'],
            },
            {
              model: VolunteerSubscription,
              as: 'subscriptions',
              attributes: ['id', 'userId'],
              include: [
                {
                  model: User, as: 'user', attributes: [
                    'id',
                    'userName',
                    'firstName',
                    'patronymic',
                    'lastName',
                    'isRestricted']
                },
              ]
            },
            {
              model: VolunteerCooperation,
              as: 'cooperations',
              attributes: ['id', 'userId'],
              include: [
                {
                  model: User, as: 'user', attributes: [
                    'id',
                    'userName',
                    'firstName',
                    'patronymic',
                    'lastName',
                    'isRestricted']
                },
              ]
            }
            //TODO: DateOfLastOrder

          ],
          transaction: t,
        });

        // SEARCH
        const search = createSearchStringFor('volunteer', fresh);
        await VolunteerSearch.update(
          { content: search },
          { where: { volunteerId: id, isRestricted: false }, individualHooks: true, transaction: t }
        );
        const outdatedSearch = createOutdatedSearchStringFor('volunteer', fresh);
        if (outdatedSearch) {
          const [row, created] = await VolunteerSearch.findOrCreate({
            where: { volunteerId: id, isRestricted: true },
            defaults: { content: outdatedSearch },
            transaction: t
          });
          if (!created) await row.update({ content: outdatedSearch }, { individualHooks: true, transaction: t });
        }
        return transformOwnerData('volunteer', fresh.toJSON());
      });
      console.log('VOLUNTEER');
      console.dir(result, { depth: null });
      res.status(200).send({ code: 'VOLUNTEER.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_UPDATED';
      next(error);
    }
  }
);

// API get volunteers

router.post(
  '/get-volunteers',
  requireAuth,
  requireAny('VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST'),
  validateRequest(volunteerSchemas.volunteersQueryDTOSchema, 'body'),
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
      const order = buildOrderFor('volunteer', sort);

      // ---- base where (Volunteer) ----
      const whereVolunteer = {};
      const whereAddress = {};
      const whereContact = {};

      // view option (if you still use it)
      switch (view?.option) {
        case 'only-active': whereVolunteer.isRestricted = false; break;
        case 'only-blocked': whereVolunteer.isRestricted = true; break;
        default:              /* 'all' or undefined */        break;
      }

      // general filters

      if (filters?.general?.dateBeginningRange) {
        whereVolunteer.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereVolunteer.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }
      //TODO:
      // dateOfLastOrder filter

      const whereLastOrderDate = { isLatest: true }
      const dates = filters?.general?.dateLastOrderRange || [];
      const datesRequired = (dates.length ?? 0) > 0;
      if (datesRequired) {
        whereLastOrderDate.date = betweenDatesInclusive(filters.general.dateUpdateRange);
        console.log('whereLastOrderDate.date', whereLastOrderDate.date);
      }

      // details && has... filter
      const buildHasInstsLiteral = (has, includeOutdated) => {
        const existsKeyword = has ? 'EXISTS' : 'NOT EXISTS';
        const restrictedClause = includeOutdated ? '' : 'AND i."isRestricted" = false';

        return Sequelize.literal(`
          ${existsKeyword} (
            SELECT 1
            FROM "institutes" i
            WHERE i."volunteerId" = "volunteer"."id"
            ${restrictedClause}
          )
        `);
      };

      const buildHasLiteral = (has, includeOutdated, tableName) => {
        const existsKeyword = has ? 'EXISTS' : 'NOT EXISTS';
        const restrictedClause = includeOutdated ? '' : 'AND u."isRestricted" = false';

        return Sequelize.literal(`
          ${existsKeyword} (
            SELECT 1
            FROM "${tableName}" t
            JOIN "users" u
            ON u.id = t."userId"
            ${restrictedClause}
            WHERE t."volunteerId" = "volunteer"."id"
          )
        `);
      };


      const buildInstLiteral = (categoriesList, includeOutdated) => {
        const restrictedClause = includeOutdated ? '' : 'AND i."isRestricted" = false';
        return Sequelize.literal(`
                EXISTS (
                  SELECT 1
                    FROM "institutes" i
                    WHERE i."volunteerId" = "volunteer"."id"
                    AND i."category" IN (${categoriesList})
                     ${restrictedClause}
                )
              `);
      };
      const buildUserLiteral = (userList, tableName) => {
        const restrictedClause = includeOutdated ? '' : 'AND u."isRestricted" = false';
        return Sequelize.literal(`
                EXISTS (
                  SELECT 1
                    FROM "${tableName}" c
                    JOIN "users" u
                    ON u.id = c."userId"
                    ${restrictedClause}
                    WHERE c."volunteerId" = "volunteer"."id"
                    AND c."userId" IN (${userList})
                )
              `);
      };

      const hasInstituteValue = filters?.general?.hasInstitute;
      const instituteCondition = hasInstituteValue !== undefined && hasInstituteValue !== null;
      const hasInstitute = instituteCondition
        ? buildHasInstsLiteral(!!hasInstituteValue, !!includeOutdated)
        : undefined;

      const hasSubscriptionValue = filters?.general?.hasSubscription;
      const subscriptionCondition = hasSubscriptionValue !== undefined && hasSubscriptionValue !== null;
      const hasSubscription = subscriptionCondition
        ? buildHasLiteral(!!hasSubscriptionValue, !!includeOutdated, "volunteer-subscriptions")
        : undefined;

      const hasCooperationValue = filters?.general?.hasCooperation;
      const cooperationCondition = hasCooperationValue !== undefined && hasCooperationValue !== null;
      const hasCooperation = cooperationCondition
        ? buildHasLiteral(!!hasCooperationValue, !!includeOutdated, "volunteer-cooperations")
        : undefined;

      const details = filters?.general?.details ?? [];
      const strict = !!filters?.mode?.strictDetail;
      const op = strict ? Op.and : Op.or;
      if (details.length > 0) {
        whereVolunteer[op] = [
          ...details.map(detail => ({ [detail]: { [Op.not]: null } })),
          ...(hasInstitute ? [hasInstitute] : []),
          ...(hasSubscription ? [hasSubscription] : []),
          ...(hasCooperation ? [hasCooperation] : []),
        ];
      } else {
        if (hasInstitute) {
          whereVolunteer[op] = [hasInstitute];
        }
        if (hasSubscription) {
          whereVolunteer[op] = [...(whereVolunteer[op] ?? []), hasSubscription];
        }
        if (hasCooperation) {
          whereVolunteer[op] = [...(whereVolunteer[op] ?? []), hasCooperation];
        }
      }


      //institutes
      const categories = filters?.general?.categories || [];
      const institutesRequired = (categories.length ?? 0) > 0;
      if (institutesRequired) {
        const categoriesList = categories.map(s => `'${s}'`).join(',');
        whereVolunteer[Op.and] = [
          ...(whereVolunteer[Op.and] ?? []),
          buildInstLiteral(categoriesList, !!includeOutdated),
        ];
      }

      // subscriptions and cooperations filter
      const subs = filters?.general?.subscriptions || [];
      const subscriptionsRequired = (subs.length ?? 0) > 0;
      if (subscriptionsRequired) {
        const userList = subs.map(Number).join(',');
        whereVolunteer[Op.and] = [
          ...(whereVolunteer[Op.and] ?? []),
          buildUserLiteral(userList, "volunteer-subscriptions"),
        ];
      }
      const coops = filters?.general?.cooperations || [];
      const cooperationsRequired = (coops.length ?? 0) > 0;
      if (cooperationsRequired) {
        const userList = coops.map(Number).join(',');
        whereVolunteer[Op.and] = [
          ...(whereVolunteer[Op.and] ?? []),
          buildUserLiteral(userList, "volunteer-cooperations"),
        ];
      }

      const instsRequired =
        institutesRequired ? true :
          (
            instituteCondition ? (!!hasInstituteValue && strict) :
              false
          );

      const subsRequired =
        subscriptionsRequired ? true :
          (
            subscriptionCondition ? (!!hasInstituteValue && strict) :
              false
          );

      const coopsRequired =
        cooperationsRequired ? true :
          (
            cooperationCondition ? (!!hasInstituteValue && strict) :
              false
          );



      // contact types filter (weak/strong)
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = buildContactOwnerIdSubquery('volunteer', contactTypes, includeOutdated ? true : false, !!filters?.mode?.strictContact);
        if (!includeOutdated) whereContact.isRestricted = false;
        if (sub) whereContact.volunteerId = { [Op.in]: sub };
      }

      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = (addresses.countries?.length ?? 0) > 0;
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery('volunteer', addresses, includeOutdated ? true : false, !!filters?.mode?.strictAddress);
        if (!includeOutdated) whereAddress.isRestricted = false;
        if (sub) whereAddress.volunteerId = { [Op.in]: sub };
      }


      // ---- includes (contacts / addresses / outdated names / search) ----
      const includes = [
        {
          model: VolunteerContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact
        },
        {
          model: VolunteerAddress,
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
          model: VolunteerOutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'firstName', 'patronymic', 'lastName'],
          //separate: true,
        },
        {
          model: Institute,
          as: 'institutes',
          required: instsRequired,
          attributes: ['id', 'instituteName', 'category', 'isRestricted', 'isDeletable'],
        },
        {
          model: VolunteerSubscription,
          as: 'subscriptions',
          attributes: ['id', 'userId'],
          required: subsRequired,
          include: [
            {
              model: User, as: 'user', attributes: [
                'id',
                'userName',
                'firstName',
                'patronymic',
                'lastName',
                'isRestricted']
            },
          ]
        },
        {
          model: VolunteerCooperation,
          as: 'cooperations',
          attributes: ['id', 'userId'],
          required: coopsRequired,
          include: [
            {
              model: User, as: 'user', attributes: [
                'id',
                'userName',
                'firstName',
                'patronymic',
                'lastName',
                'isRestricted']
            },
          ]
        }

        //TODO: DateOfLastOrder
      ];

      // search by VolunteerSearch.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: VolunteerSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          }
        });
      }

      // ---- count (distinct) ----
      const total = await Volunteer.count({
        where: whereVolunteer,
        include: includes,
        distinct: true,
      });

      console.log('whereVolunteer', whereVolunteer);
      console.log('ORDER', order);
      /*  console.log('includes', includes);
       console.log('whereVolunteer', whereVolunteer); */

      // ---- page ----
      const volunteers = await Volunteer.findAll({
        where: whereVolunteer,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        // subQuery: false, // avoid subquery limits in includes
        distinct: true,
      });

      const items = volunteers.map(p => transformOwnerData('volunteer', p.toJSON()));
      //console.log('VOLUNTEERs', items);

      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.LIST_FAILED';
      next(error);
    }
  }
);

router.get("/get-volunteer-by-id/:id",
  requireAuth,
  requireAny('VIEW_VOLUNTEER', 'EDIT_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findByPk(id, {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        include: [
          {
            model: VolunteerContact,
            as: 'contacts',
            attributes: ['id', 'type', 'content', 'isRestricted'],
          },
          {
            model: VolunteerAddress,
            as: 'addresses',
            attributes: ['id', 'isRestricted', 'isRecoverable'],
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
            model: VolunteerOutdatedName, as: 'outdatedNames',
            attributes: ['id', 'firstName', 'patronymic', 'lastName']
          },
          {
            model: Institute,
            as: 'institutes',
            attributes: ['id', 'instituteName', 'category', 'isRestricted', 'isDeletable'],
          },
          {
            model: VolunteerSubscription,
            as: 'subscriptions',
            attributes: ['id', 'userId'],
            include: [
              {
                model: User, as: 'user', attributes: [
                  'id',
                  'userName',
                  'firstName',
                  'patronymic',
                  'lastName',
                  'isRestricted']
              },
            ]
          },
          {
            model: VolunteerCooperation,
            as: 'cooperations',
            attributes: ['id', 'userId'],
            include: [
              {
                model: User, as: 'user', attributes: [
                  'id',
                  'userName',
                  'firstName',
                  'patronymic',
                  'lastName',
                  'isRestricted']
              },
            ]
          }
          //TODO: DateOfLastOrder

        ],
      });
      if (!volunteer) throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);
      const data = transformOwnerData('volunteer', volunteer.toJSON());
      console.log('VOLUNTEER', data);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_FOUND';
      next(error);
    }
  });

router.get(
  "/check-volunteer-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findByPk(id);
      if (!volunteer) throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);

      //TODO: find does this volunteer has orders
      const [countOrders] = await Promise.all([
        /*         Order.count({
                  where: {volunteerId: id}
                }),
                }) */
      ]);
      const count = (countOrders ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'VOLUNTEER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_CHECKED';
      next(error);
    }
  });

router.delete(
  "/delete-volunteer/:id",
  requireAuth,
  requireOperation('DELETE_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        // 1) Ensure the volunteer exists
        const volunteer = await Volunteer.findByPk(id, { transaction: t });
        if (!volunteer) throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);

        // 2) Delete the volunteer (DB will cascade child tables)
        const destroyed = await Volunteer.destroy({
          where: { id },
          transaction: t,
          individualHooks: true, // will run volunteer-level hooks; children won't fire via DB cascade
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'VOLUNTEER.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_DELETED';
      next(error);
    }
  });

/* router.get(
  "/check-volunteer-before-block/:id",
  requireAuth,
  requireOperation('BLOCK_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findByPk(id);
      if (!volunteer) throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);


      ]);
      const count = (countHouses ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'VOLUNTEER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_CHECKED';
      next(error);
    }
  }); */

router.patch(
  '/block-volunteer',
  requireAuth,
  requireAny('BLOCK_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (t) => {
        // 1) Block the volunteer
        const [affected] = await Volunteer.update(
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
          throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);
        }
      });

      res.status(200).send({ code: 'VOLUNTEER.BLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_BLOCKED';
      next(error);
    }
  }
);

router.patch(
  "/unblock-volunteer",
  requireAuth,
  requireAny('UNBLOCK_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdSchema, 'body'),
  async (req, res, next) => {
    try {
      let id = req.body.id;
      const [affected] = await Volunteer.update(
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
        throw new CustomError('ERRORS.VOLUNTEER.NOT_FOUND', 404);
      }
      res.status(200).send({ code: 'VOLUNTEER.UNBLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.NOT_UNBLOCKED';
      next(error);
    }
  });

router.get("/search-contacts/:q",
  requireAuth,
  requireAny('ADD_NEW_ORDER', 'EDIT_ORDER'),
  validateRequest(z.object({ q: z.string().trim().min(3) }), 'params'),
  async (req, res, next) => {
    try {
      const q = req.params.q;
      const contacts = await VolunteerContact.findAll({
        where: {
          content: {
            [Op.iLike]: `%${q}%`,
          },
        },
        attributes: ['id', 'content', 'type', 'volunteerId'],
        limit: 20,
        order: [['content', 'ASC']],
        raw: true,
      })
      res.status(200).send({ data: contacts });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.VOLUNTEER.CONTACT_NOT_FOUND';
      next(error);
    }
  });
export default router;
