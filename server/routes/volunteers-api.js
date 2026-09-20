import { Router } from "express";
import { Op, Sequelize } from 'sequelize';
import {
  Country, Region, District, Locality,
  VolunteerAddress, Volunteer, VolunteerContact, VolunteerSearch, VolunteerOutdatedName,
  VolunteerSubscription, VolunteerCooperation, VolunteerInstitute,
  User, Order
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as volunteerSchemas from "../../shared/dist/schemas/volunteer.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import {
  collectFlatContacts,
  findDuplicateContacts,
  fullName,
  saveOwnerContactsAndAddress
} from "../controllers/ctrl-create-owner-contacts-address.js";
import {
  createSearchStringFor,
  createOutdatedSearchStringFor,
  refreshVolunteerSearch
} from "../controllers/ctrl-search-string.js";
import {
  betweenDatesInclusive,
  buildAddressOwnerIdSubquery,
  buildContactOwnerIdSubquery,
  buildOrderFor,
  buildSearchContentWhere
} from "../controllers/ctrl-owner-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";

const router = Router();

router.post(
  "/check-volunteer-data",
  requireAuth,
  requireAny('ADD_NEW_VOLUNTEER', 'EDIT_VOLUNTEER'),
  validateRequest(volunteerSchemas.checkVolunteerDataSchema, "body"),
  async (req, res, next) => {
    try {
      const volunteer = req.body;
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

      const response = { data: { duplicatesName, duplicatesContact } };
      if (duplicatesName.length > 0 || duplicatesContact.length > 0) {
        response.code = 'ERRORS.VOLUNTEER.HAS_DATA_DUPLICATES';
      }
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
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

      const result = await withTransaction(async (transaction) => {

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
          { transaction }
        );

        await saveOwnerContactsAndAddress(
          'volunteer',
          volunteer,
          creatingVolunteer,
          { VolunteerContact, VolunteerAddress },
          transaction
        );

        if ((creatingVolunteer.draftInstitutes ?? []).length) {
          await VolunteerInstitute.bulkCreate(
            creatingVolunteer.draftInstitutes.map((i) => ({
              instituteName: i.instituteName,
              category: i.category,
              volunteerId: volunteer.id,
            })),
            {
              transaction,
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
              transaction,
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
              transaction,
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
              model: VolunteerInstitute,
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
            },
          ],
          transaction,
        });

        const searchString = createSearchStringFor('volunteer', freshVolunteer);
        await VolunteerSearch.create({ volunteerId: volunteer.id, content: searchString }, { transaction });

        return fullName(volunteer);
      });

      res.status(201).send({ code: 'SUCCESS.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
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
      const result = await withTransaction(async (transaction) => {
        const volunteer = await Volunteer.findByPk(id, { transaction });
        if (!volunteer) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        // Update main volunteer data
        if (changingData?.main) {
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Volunteer.update(
              payload,
              {
                where: { id },
                transaction,
                individualHooks: true
              });
          }
        }

        // Apply related data changes
        await applyOwnerUpdates(
          'volunteer',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          transaction
        );

        // Reload volunteer with related data
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
              model: VolunteerInstitute,
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
        });

        // Refresh search strings
        const search = createSearchStringFor('volunteer', fresh);
        await VolunteerSearch.update(
          { content: search },
          { where: { volunteerId: id, isRestricted: false }, individualHooks: true, transaction }
        );
        const outdatedSearch = createOutdatedSearchStringFor('volunteer', fresh);
        if (outdatedSearch) {
          const [row, created] =
            await VolunteerSearch.findOrCreate({
              where: {
                volunteerId: id,
                isRestricted: true,
              },
              defaults: {
                content: outdatedSearch,
              },
              transaction,
            });

          if (!created) {
            await row.update(
              { content: outdatedSearch },
              {
                individualHooks: true,
                transaction,
              },
            );
          }
        } else {
          await VolunteerSearch.destroy({
            where: {
              volunteerId: id,
              isRestricted: true,
            },
            transaction,
          });
        }

        return transformOwnerData('volunteer', fresh.toJSON());
      });
      res.status(200).send({ code: 'SUCCESS.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  }
);

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
      } = req.body;

      const includeOutdated = !!view?.includeOutdated; // false => only actual
      const order = buildOrderFor('volunteer', sort);

      // Base filters
      const whereVolunteer = {};
      const whereAddress = {};
      const whereContact = {};

      switch (view?.option) {
        case 'only-active': whereVolunteer.isRestricted = false; break;
        case 'only-blocked': whereVolunteer.isRestricted = true; break;
        default: break;
      }

      // General filters

      if (filters?.general?.dateBeginningRange) {
        whereVolunteer.dateOfStart = betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereVolunteer.dateOfRestriction = betweenDatesInclusive(filters.general.dateRestrictionRange);
      }

      // Last order date filter
      const dateLastOrderRange =
        filters?.general?.dateLastOrderRange;

      if (dateLastOrderRange) {
        whereVolunteer[Op.and] = [
          ...(whereVolunteer[Op.and] ?? []),

          Sequelize.where(
            Sequelize.literal(`(
        SELECT MAX(o."createdAt")
        FROM "orders" o
        WHERE o."volunteerId" = "volunteer"."id"
      )`),
            betweenDatesInclusive(dateLastOrderRange),
          ),
        ];
      }

      // Detail filters
      const buildHasInstsLiteral = (has, includeOutdated) => {
        const existsKeyword = has ? 'EXISTS' : 'NOT EXISTS';
        const restrictedClause = includeOutdated ? '' : 'AND i."isRestricted" = false';

        return Sequelize.literal(`
          ${existsKeyword} (
            SELECT 1
            FROM "volunteer-institutes" i
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
                    FROM "volunteer-institutes" i
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
                    WHERE c."volunteerId" = "volunteer"."id"
                    AND c."userId" IN (${userList})
                    ${restrictedClause}
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

      // Institute filters
      const categories = filters?.general?.categories || [];
      const institutesRequired = (categories.length ?? 0) > 0;
      if (institutesRequired) {
        const categoriesList = categories.join(',');
        whereVolunteer[Op.and] = [
          ...(whereVolunteer[Op.and] ?? []),
          buildInstLiteral(categoriesList, !!includeOutdated),
        ];
      }

      // Subscription and cooperation filters
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
        subscriptionsRequired
          ? true
          : (
            subscriptionCondition
              ? (!!hasSubscriptionValue && strict)
              : false
          );

      const coopsRequired =
        cooperationsRequired
          ? true
          : (
            cooperationCondition
              ? (!!hasCooperationValue && strict)
              : false
          );



      // Contact filters
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = buildContactOwnerIdSubquery('volunteer', contactTypes, includeOutdated ? true : false, !!filters?.mode?.strictContact);
        if (!includeOutdated) whereContact.isRestricted = false;
        if (sub) whereContact.volunteerId = { [Op.in]: sub };
      }

      // Address filters
      const addresses = filters?.address || {};
      const addrRequired = [
        addresses.countries,
        addresses.regions,
        addresses.districts,
        addresses.localities,
      ].some(
        (items) => (items?.length ?? 0) > 0,
      );
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery('volunteer', addresses, includeOutdated ? true : false, !!filters?.mode?.strictAddress);
        if (!includeOutdated) whereAddress.isRestricted = false;
        if (sub) whereAddress.volunteerId = { [Op.in]: sub };
      }


      // Related data
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
        },
        {
          model: VolunteerInstitute,
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
        },
        {
          model: Order,
          as: 'orders',
          attributes: ['id', 'createdAt'],
          required: false,
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']],
        },
      ];

      // Search
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

      // Total count
      const total = await Volunteer.count({
        where: whereVolunteer,
        include: includes,
        distinct: true,
      });

      // Paginated result
      const volunteers = await Volunteer.findAll({
        where: whereVolunteer,
        attributes: { exclude: ['createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        distinct: true,
      });

      const items = volunteers.map(p => transformOwnerData('volunteer', p.toJSON()));
      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  }
);

router.get("/get-volunteer-by-id/:id",
  requireAuth,
  requireAny('VIEW_VOLUNTEER', 'EDIT_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdParamSchema, 'params'),
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
            model: VolunteerInstitute,
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
      });
      if (!volunteer) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      const data = transformOwnerData('volunteer', volunteer.toJSON());
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  });

async function countVolunteerDependencies(volunteerId, transaction) {
  return Order.count({
    where: { volunteerId },
    transaction,
  });
}

router.get(
  "/check-volunteer-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const volunteer = await Volunteer.findByPk(id);
      if (!volunteer) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

      const count = await countVolunteerDependencies(id);
      const response = {
        data: count,
        ...(count ? { code: 'ERRORS.VOLUNTEER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  });

router.delete(
  "/delete-volunteer/:id",
  requireAuth,
  requireOperation('DELETE_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (transaction) => {
        // Ensure the volunteer exists
        const volunteer = await Volunteer.findByPk(id, { transaction });
        if (!volunteer) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

        const dependenciesCount = await countVolunteerDependencies(id, transaction);
        if (dependenciesCount > 0) {
          throw new CustomError('ERRORS.VOLUNTEER.HAS_DEPENDENCIES', 409);
        }

        // Delete the volunteer (DB will cascade child tables)
        const destroyed = await Volunteer.destroy({
          where: { id },
          transaction,
          individualHooks: true,
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'SUCCESS.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_DELETE_FAILED';
      next(error);
    }
  });

router.patch(
  '/block-volunteer',
  requireAuth,
  requireOperation('BLOCK_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (transaction) => {

        const [affected] = await Volunteer.update(
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

        await refreshVolunteerSearch(
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
  "/unblock-volunteer",
  requireAuth,
  requireOperation('UNBLOCK_VOLUNTEER'),
  validateRequest(volunteerSchemas.volunteerIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;

      await withTransaction(async (transaction) => {

        const [affected] = await Volunteer.update(
          {
            isRestricted: false,
            causeOfRestriction: null,
            dateOfRestriction: null
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
        await refreshVolunteerSearch(
          id,
          transaction,
        );
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  });

router.get("/search-contacts/:q",
  requireAuth,
  requireAny('ADD_NEW_ORDER', 'EDIT_ORDER'),
  validateRequest(volunteerSchemas.volunteerSearchContactSchema, 'params'),
  async (req, res, next) => {
    try {
      const contactContent = req.params.q;
      const contacts = await VolunteerContact.findAll({
        where: {
          content: {
            [Op.iLike]: `%${contactContent}%`,
          },
        },
        attributes: ['id', 'content', 'type', 'volunteerId'],
        limit: 20,
        order: [['content', 'ASC']],
        raw: true,
      });
      res.status(200).send({ data: contacts });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  });
export default router;
