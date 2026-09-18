import { Router } from "express";
import {
  Op,
  fn,
  col,
  where as sqlWhere,
  UniqueConstraintError,
} from 'sequelize';
import {
  Country,
  District,
  Locality,
  Order,
  RefreshToken,
  Region,
  Role,
  User,
  UserAddress,
  UserContact,
  UserOutdatedName,
  UserSearch,
  Volunteer,
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";

import CustomError from "../shared/customError.js";
import * as userSchemas from "../../shared/dist/schemas/user.schema.js";

import { hashPassword } from "../controllers/passwords.mjs";
import { verify } from '../controllers/passwords.mjs';
import { withTransaction } from "../controllers/with-transaction.js";
import {
  collectFlatContacts,
  findDuplicateContacts,
  fullName,
  saveOwnerContactsAndAddress,
} from "../controllers/ctrl-create-owner-contacts-address.js";
import {
  createOutdatedSearchStringFor,
  createSearchStringFor,
} from "../controllers/ctrl-search-string.js";
import {
  betweenDatesInclusive,
  buildAddressOwnerIdSubquery,
  buildContactOwnerIdSubquery,
  buildOrderFor,
  buildSearchContentWhere,
} from "../controllers/ctrl-owner-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";

const router = Router();

async function userNameExists(
  userName,
  excludeId = null,
  transaction = undefined,
) {
  const conditions = [
    sqlWhere(fn('lower', col('userName')), userName.toLowerCase()),
  ];

  if (excludeId) {
    conditions.push({
      id: {
        [Op.ne]: excludeId,
      },
    });
  }

  return User.count({
    where: {
      [Op.and]: conditions,
    },
    transaction,
  });
}

function isUserNameUniqueError(error) {
  return (
    error instanceof UniqueConstraintError &&
    (error.original?.constraint === 'uq_users_username_ci' ||
      error.parent?.constraint === 'uq_users_username_ci')
  );
}

router.get(
  "/check-user-name",
  requireAuth,
  requireAny('ADD_NEW_USER', 'EDIT_USER'),
  validateRequest(userSchemas.checkUserNameSchema, "query"),
  async (req, res, next) => {
    try {
      const { userName, id } = req.query;
      const duplicateCount = await userNameExists(userName, id);

      const response = {
        data: duplicateCount !== 0,

        ...(duplicateCount && {
          code: 'ERRORS.USER.ALREADY_EXISTS',
        }),
      };

      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.post(
  "/check-user-data",
  requireAuth,
  requireAny('ADD_NEW_USER', 'EDIT_USER'),
  validateRequest(userSchemas.checkUserDataSchema, "body"),
  async (req, res, next) => {
    try {
      const user = req.body;
      const excludeSelf = user.id ? { id: { [Op.ne]: user.id } } : {};

      const nameRows = await User.findAll({
        where: {
          ...excludeSelf,
          firstName: { [Op.iLike]: user.firstName },
          lastName: { [Op.iLike]: user.lastName },
        },
        attributes: ['userName'],
        raw: true,
      });
      const duplicatesName = nameRows.map((r) => r.userName);

      const flat = collectFlatContacts(user.contacts);
      const duplicatesContact = await findDuplicateContacts({
        ownerKind: 'user',
        models: { User, UserContact },
        excludeSelf: user.id ? { id: { [Op.ne]: user.id } } : {},
        flatContacts: flat,
      });

      let response = { data: { duplicatesName, duplicatesContact } };
      if (duplicatesName.length > 0 || duplicatesContact.length > 0) {
        response.code = 'ERRORS.USER.HAS_DATA_DUPLICATES';
      }
      res.status(200).send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.post(
  '/create-user',
  requireAuth,
  requireOperation('ADD_NEW_USER'),
  validateRequest(userSchemas.userDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingUser = req.body;

      const result = await withTransaction(async (transaction) => {
        const duplicateCount = await userNameExists(
          creatingUser.userName,
          null,
          transaction,
        );

        if (duplicateCount > 0) {
          throw new CustomError('ERRORS.USER.ALREADY_EXISTS', 409);
        }

        const role = await Role.findByPk(creatingUser.roleId, { transaction });
        if (!role) throw new CustomError('ERRORS.USER.ROLE_REQUIRED', 422);

        const hashed = await hashPassword(creatingUser.password);
        const user = await User.create(
          {
            userName: creatingUser.userName,
            password: hashed,
            firstName: creatingUser.firstName,
            patronymic: creatingUser.patronymic,
            lastName: creatingUser.lastName,
            roleId: creatingUser.roleId,
            comment: creatingUser.comment,
            isRestricted: creatingUser.isRestricted,
            causeOfRestriction: creatingUser.causeOfRestriction,
            dateOfRestriction: creatingUser.dateOfRestriction,
          },
          { transaction },
        );

        await saveOwnerContactsAndAddress(
          'user',
          user,
          creatingUser,
          { UserContact, UserAddress },
          transaction,
        );

        const freshUser = await User.findOne({
          where: { id: user.id },
          attributes: {
            exclude: [
              'password',
              'failedLoginCount',
              'lockedUntil',
              'bruteWindowStart',
              'bruteStrikeCount',
              'createdAt',
              'updatedAt',
            ],
          },
          include: [
            {
              model: Role,
              attributes: ['name'],
            },
            {
              model: UserContact,
              as: 'contacts',
              attributes: ['content', 'isRestricted'],
            },
            {
              model: UserAddress,
              as: 'addresses',
              attributes: ['isRestricted'],
              include: [
                { model: Country, attributes: ['name'] },
                { model: Region, attributes: ['name'] },
                { model: District, attributes: ['name'] },
                { model: Locality, attributes: ['name'] },
              ],
            },
          ],
          transaction,
        });

        const searchString = createSearchStringFor('user', freshUser);
        await UserSearch.create(
          { userId: user.id, content: searchString },
          { transaction },
        );

        return user.userName;
      });

      res.status(201).send({ code: 'SUCCESS.CREATED', data: result });
    } catch (error) {
      if (isUserNameUniqueError(error)) {
        return next(
          new CustomError('ERRORS.USER.ALREADY_EXISTS', 409),
        );
      }
      error.code = error.code ?? 'ERRORS.DATA_CREATE_FAILED';
      next(error);
    }
  },
);

router.patch(
  '/change-password',
  requireAuth,
  requireOperation('CHANGE_USER_PASSWORD'),
  validateRequest(userSchemas.changePasswordSchema, 'body'),
  async (req, res, next) => {
    try {
      const { userId, newPassword, currentPassword } = req.body;

      const actorId = req.user.id;
      const isSelf = actorId === userId;

      // TODO: test isSelf
      const target = await User.findByPk(userId, {
        attributes: ['id', 'password', 'roleId'],
        raw: false,
      });
      if (!target) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

      if (isSelf) {
        if (!currentPassword) {
          throw new CustomError('ERRORS.USER.CURRENT_PASSWORD_REQUIRED', 422);
        }

        const ok = await verify(target.password, currentPassword);
        if (!ok) {
          throw new CustomError('ERRORS.USER.CURRENT_PASSWORD_INVALID', 422);
        }
      }

      const hashed = await hashPassword(newPassword);

      await withTransaction(async (transaction) => {
        const [affected] = await User.update(
          { password: hashed },
          { where: { id: userId }, transaction, individualHooks: true },
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.USER.PASSWORD_NOT_CHANGED', 409);
        }
        await RefreshToken.destroy({ where: { userId }, transaction });
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

router.post(
  '/update-user',
  requireAuth,
  requireOperation('EDIT_USER'),
  validateRequest(userSchemas.updateUserDataSchema, 'body'),
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
        const user = await User.findByPk(id, { transaction });
        if (!user) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        const newUserName = changingData?.main?.userName;

        if (newUserName !== undefined) {
          const duplicateCount = await userNameExists(
            newUserName,
            id,
            transaction,
          );

          if (duplicateCount > 0) {
            throw new CustomError('ERRORS.USER.ALREADY_EXISTS', 409);
          }
        }

        if (changingData?.main) {
          const payload = changingData.main;

          if (Object.keys(payload).length > 0) {
            if (payload.roleId !== undefined) {
              const role = await Role.findByPk(payload.roleId, { transaction });

              if (!role) {
                throw new CustomError('ERRORS.USER.ROLE_REQUIRED', 422);
              }
            }
            await User.update(payload, {
              where: { id },
              transaction,
              individualHooks: true,
            });
          }

          if (payload.isRestricted === true) {
            await RefreshToken.destroy({
              where: { userId: id },
              transaction,
            });
          }
        }

        await applyOwnerUpdates(
          'user',
          id,
          { changingData, restoringData, outdatingData, deletingData },
          transaction,
        );

        // Reload the updated user with all data required for transformation and search.
        const fresh = await User.findOne({
          where: { id },
          attributes: {
            exclude: [
              'password',
              'failedLoginCount',
              'lockedUntil',
              'bruteWindowStart',
              'bruteStrikeCount',
              'createdAt',
              'updatedAt',
            ],
          },
          include: [
            { model: Role, attributes: ['name'] },
            {
              model: UserContact,
              as: 'contacts',
              attributes: ['id', 'type', 'content', 'isRestricted'],
            },
            {
              model: UserAddress,
              as: 'addresses',
              attributes: ['id', 'isRestricted', 'isRecoverable'],
              include: [
                { model: Country, attributes: ['id', 'name'] },
                { model: Region, attributes: ['id', 'shortName', 'name'] },
                { model: District, attributes: ['id', 'shortName', 'name'] },
                { model: Locality, attributes: ['id', 'shortName', 'name'] },
              ],
            },
            {
              model: UserOutdatedName,
              as: 'outdatedNames',
              attributes: [
                'id',
                'userName',
                'firstName',
                'patronymic',
                'lastName',
              ],
            },
          ],
          transaction,
        });

        // Rebuild current and outdated search content.
        const search = createSearchStringFor('user', fresh);
        await UserSearch.update(
          { content: search },
          {
            where: { userId: id, isRestricted: false },
            individualHooks: true,
            transaction,
          },
        );

        const outdatedSearch = createOutdatedSearchStringFor('user', fresh);

        if (outdatedSearch) {
          const [row, created] = await UserSearch.findOrCreate({
            where: { userId: id, isRestricted: true },
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
          await UserSearch.destroy({
            where: {
              userId: id,
              isRestricted: true,
            },
            transaction,
          });
        }
        return transformOwnerData('user', fresh.toJSON());
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: result });
    } catch (error) {
      if (isUserNameUniqueError(error)) {
        return next(
          new CustomError('ERRORS.USER.ALREADY_EXISTS', 409),
        );
      }
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

router.post(
  '/get-users',
  requireAuth,
  requireAny('VIEW_LIMITED_USERS_LIST', 'VIEW_FULL_USERS_LIST'),
  validateRequest(userSchemas.usersQueryDTOSchema, 'body'),
  async (req, res, next) => {
    try {
      const {
        page: { size: pageSize, number: pageNumber },
        sort,
        search,
        view,
        filters,
      } = req.body;

      // Include outdated data when matching search and filters.
      const includeOutdated = !!view?.includeOutdated;
      const order = buildOrderFor('user', sort);

      const whereUser = {};
      const whereAddress = {};
      const whereContact = {};

      switch (view?.option) {
        case 'only-active':
          whereUser.isRestricted = false;
          break;
        case 'only-blocked':
          whereUser.isRestricted = true;
          break;
        default:
          break;
      }

      if (filters?.general?.roles?.length) {
        whereUser.roleId = { [Op.in]: filters.general.roles };
      }

      if (filters?.general?.dateBeginningRange) {
        whereUser.dateOfStart = betweenDatesInclusive(
          filters.general.dateBeginningRange,
        );
      }

      if (filters?.general?.dateRestrictionRange) {
        whereUser.dateOfRestriction = betweenDatesInclusive(
          filters.general.dateRestrictionRange,
        );
      }

      if (filters?.general?.details?.includes('comment')) {
        whereUser.comment = {
          [Op.not]: null,
        };
      }

      // contact types filter (weak/strong)
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;

      if (contRequired) {
        const sub = buildContactOwnerIdSubquery(
          'user',
          contactTypes,
          includeOutdated ? true : false,
          !!filters?.mode?.strictContact,
        );

        if (!includeOutdated) whereContact.isRestricted = false;
        if (sub) whereContact.userId = { [Op.in]: sub };
      }

      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = [
        addresses.countries,
        addresses.regions,
        addresses.districts,
        addresses.localities,
      ].some((ids) => (ids?.length ?? 0) > 0);

      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery(
          'user',
          addresses,
          includeOutdated ? true : false,
          !!filters?.mode?.strictAddress,
        );

        if (!includeOutdated) whereAddress.isRestricted = false;
        if (sub) whereAddress.userId = { [Op.in]: sub };
      }

      // includes (contacts / addresses / outdated names / search)
      const includes = [
        { model: Role, attributes: ['name'] },
        {
          model: UserContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact,
        },
        {
          model: UserAddress,
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
          model: UserOutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName'],
        },
      ];

      // search by UserSearch.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: UserSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          },
        });
      }

      const total = await User.count({
        where: whereUser,
        include: includes,
        distinct: true,
      });

      const users = await User.findAll({
        where: whereUser,
        attributes: {
          exclude: [
            'password',
            'failedLoginCount',
            'lockedUntil',
            'bruteWindowStart',
            'bruteStrikeCount',
            'createdAt',
            'updatedAt',
          ],
        },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        distinct: true,
      });
      const items = users.map((u) => transformOwnerData('user', u.toJSON()));

      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  "/get-user-by-id/:id",
  requireAuth,
  requireAny('VIEW_USER', 'EDIT_USER'),
  validateRequest(userSchemas.userIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = await User.findByPk(id, {
        attributes: {
          exclude: [
            'password',
            'failedLoginCount',
            'lockedUntil',
            'bruteWindowStart',
            'bruteStrikeCount',
            'createdAt',
            'updatedAt',
          ],
        },
        include: [
          {
            model: UserContact,
            as: 'contacts',
            attributes: ['id', 'type', 'content', 'isRestricted'],
          },
          {
            model: UserAddress,
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
            ],
          },
          {
            model: Role,
            attributes: ['name'],
          },
          {
            model: UserOutdatedName,
            as: 'outdatedNames',
            attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName'],
          },
        ],
      });
      if (!user) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      const data = transformOwnerData('user', user.toJSON());
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

router.get(
  "/get-list-of-users",
  requireAuth,
  requireAny('VIEW_LIMITED_VOLUNTEERS_LIST', 'VIEW_FULL_VOLUNTEERS_LIST'),
  async (req, res, next) => {
    try {
      const users = await User.findAll({
        attributes: [
          'id',
          'userName',
          'firstName',
          'patronymic',
          'lastName',
          'isRestricted',
        ],
        order: [['firstName', 'ASC']],
      });

      const data = users.map((u) => ({
        id: u.id,
        name: fullName(u) + ' - ' + u.userName,
        isRestricted: u.isRestricted,
      }));
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_FETCH_FAILED';
      next(error);
    }
  },
);

async function countUserDependencies(userId, transaction) {
  const [volunteersCount, ordersCount] = await Promise.all([
    Volunteer.count({
      where: { userId },
      transaction,
    }),

    Order.count({
      where: { userId },
      transaction,
    }),
  ]);

  return volunteersCount + ordersCount;
}

router.get(
  "/check-user-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_USER'),
  validateRequest(userSchemas.userIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = await User.findByPk(id);
      if (!user) throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);

      const count = await countUserDependencies(id);

      const response = {
        data: count,
        ...(count ? { code: 'ERRORS.USER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_CHECK_FAILED';
      next(error);
    }
  },
);

router.delete(
  "/delete-user/:id",
  requireAuth,
  requireOperation('DELETE_USER'),
  validateRequest(userSchemas.userIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (transaction) => {
        const user = await User.findByPk(id, { transaction });

        if (!user) {
          throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
        }

        const dependenciesCount = await countUserDependencies(id, transaction);

        if (dependenciesCount > 0) {
          throw new CustomError('ERRORS.USER.HAS_DEPENDENCIES', 409);
        }

        await RefreshToken.destroy({ where: { userId: id }, transaction });

        const destroyed = await User.destroy({
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
  '/block-user',
  requireAuth,
  requireOperation('BLOCK_USER'),
  validateRequest(userSchemas.userBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (transaction) => {
        // Block the user
        const [affected] = await User.update(
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

        // Revoke refresh tokens (log out everywhere)
        await RefreshToken.destroy({
          where: { userId: id },
          transaction,
        });
      });

      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

router.patch(
  "/unblock-user",
  requireAuth,
  requireOperation('UNBLOCK_USER'),
  validateRequest(userSchemas.userIdSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const [affected] = await User.update(
        {
          isRestricted: false,
          causeOfRestriction: null,
          dateOfRestriction: null,
        },
        {
          where: { id },
          individualHooks: true,
        },
      );
      if (affected !== 1) {
        throw new CustomError('ERRORS.DATA_NOT_FOUND', 404);
      }
      res.status(200).send({ code: 'SUCCESS.UPDATED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.DATA_UPDATE_FAILED';
      next(error);
    }
  },
);

export default router;
