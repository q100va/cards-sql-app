import { Router } from "express";
import { Op } from 'sequelize';
import { z } from 'zod';
import {
  Country, Region, District, Locality,
  Role, UserAddress, User, UserContact, SearchUser, OutdatedName,
  RefreshToken
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as userSchemas from "../../shared/dist/user.schema.js";
import { hashPassword } from "../controllers/passwords.mjs";
import * as ctrl from "../controllers/ctrl-users.js";
import { withTransaction } from "../controllers/with-transaction.js";
import { verify } from '../controllers/passwords.mjs';


const router = Router();

// API create user

router.get(
  "/check-user-name",
  requireAuth,
  requireAny('ADD_NEW_USER', 'EDIT_USER'),
  validateRequest(userSchemas.checkUserNameSchema, "query"),
  async (req, res, next) => {
    try {
      const userName = req.query.userName.toLowerCase();
      const id = req.query.id;

      const whereParams = id ? {
        userName: { [Op.iLike]: userName },
        id: { [Op.ne]: id },
      } : {
        userName: { [Op.iLike]: userName },
      };

      const duplicateCount = await User.count({
        where: whereParams
      });

      const response = {
        data: duplicateCount !== 0,
        ...(duplicateCount ? { code: 'USER.ALREADY_EXISTS' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.TOPONYM.NAME_NOT_CHECKED';
      next(error);
    }
  });

router.post(
  "/check-user-data",
  requireAuth,
  requireAny('ADD_NEW_USER', 'EDIT_USER'),
  validateRequest(userSchemas.checkUserDataSchema, "body"),
  async (req, res, next) => {
    try {
      let user = req.body;
      const excludeSelf = user.id ? { id: { [Op.ne]: user.id } } : {};

      const nameRows = await User.findAll({
        where: {
          ...excludeSelf,
          firstName: { [Op.iLike]: user.firstName },
          lastName: { [Op.iLike]: user.lastName },
        },
        attributes: ['userName'],
        raw: true
      });
      const duplicatesName = nameRows.map(r => r.userName);


      const flatContacts = [];
      for (const [type, list] of Object.entries(user.contacts ?? {})) {
        for (const v of list ?? []) {
          const content = (v ?? '').trim();
          if (content) flatContacts.push({ type, content });
        }
      }

      // Early shortcut if no contacts provided
      let duplicatesContact = [];
      if (flatContacts.length > 0) {

        const byType = new Map();
        for (const { type, content } of flatContacts) {
          if (!content) continue;
          if (!byType.has(type)) byType.set(type, new Set());
          byType.get(type).add(content);
        }

        // build OR with IN per type
        const orList = Array.from(byType.entries()).map(([type, contents]) => ({
          '$contacts.type$': type,
          '$contacts.content$': { [Op.in]: Array.from(contents) },
        }));

        const contactRows = await User.findAll({
          where: { ...excludeSelf, [Op.or]: orList },
          include: [{
            model: UserContact,
            as: 'contacts',
            attributes: ['type', 'content'],
            required: true,
          }],
          attributes: ['userName'],
          raw: true,
        });

        const byPair = new Map();
        for (const row of contactRows) {
          const type = row['contacts.type'] ?? '';
          const content = row['contacts.content'] ?? '';
          const userName = row['userName'] ?? '';

          if (!type || !content || !userName) continue;

          const key = `${type}::${content}`;
          if (!byPair.has(key)) {
            byPair.set(key, { type, content, users: new Set() });
          }
          byPair.get(key).users.add(userName);
        }

        duplicatesContact = Array.from(byPair.values())
          .map(({ type, content, users }) => ({
            type,
            content,
            users: Array.from(users).sort(),
          }))
          .sort((a, b) => a.type.localeCompare(b.type) || a.content.localeCompare(b.content));
      }

      let response = { data: { duplicatesName, duplicatesContact } };
      if (duplicatesName.length > 0 || duplicatesContact.length > 0) response.code = 'USER.HAS_DATA_DUPLICATES';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.DUPLICATES_NOT_CHECKED';
      next(error);
    }
  });

router.post(
  '/create-user',
  requireAuth,
  requireOperation('ADD_NEW_USER'),
  validateRequest(userSchemas.userDraftSchema, 'body'),
  async (req, res, next) => {
    try {
      const creatingUser = req.body;

      console.log('creatingUser', creatingUser)

      const result = await withTransaction(async (t) => {
        const role = await Role.findByPk(creatingUser.roleId, { transaction: t });
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
          { transaction: t }
        );

        const contactRows = Object.entries(creatingUser.draftContacts ?? {}).flatMap(
          ([type, list]) =>
            (list ?? [])
              .map((content) => (content ?? ''))
              .filter(Boolean)
              .map((content) => ({
                userId: user.id,
                type,
                content,
              }))
        );

        if (contactRows.length) {
          await UserContact.bulkCreate(
            contactRows, {
            validate: true, individualHooks: true, transaction: t
          }
          );
        }

        const a = creatingUser.draftAddress ?? {};
        const hasAnyAddress =
          !!a.countryId || !!a.regionId || !!a.districtId || !!a.localityId;

        if (hasAnyAddress) {
          await UserAddress.create(
            {
              userId: user.id,
              countryId: a.countryId ?? null,
              regionId: a.regionId ?? null,
              districtId: a.districtId ?? null,
              localityId: a.localityId ?? null,
            },
            { transaction: t }
          );
        }

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
              'updatedAt']
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
          transaction: t,
        });

        const searchString = ctrl.createSearchString(freshUser);
        await SearchUser.create({ userId: user.id, content: searchString }, { transaction: t });

        return user.userName;
      });

      res.status(201).send({ code: 'USER.CREATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_CREATED';
      next(error);
    }
  }
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
      const target = await User.findByPk(userId, { attributes: ['id', 'password', 'roleId'], raw: false });
      if (!target) throw new CustomError('ERRORS.USER.NOT_FOUND', 404);

      if (isSelf) {
        if (!currentPassword) {
          throw new CustomError('ERRORS.USER.CURRENT_PASSWORD_REQUIRED', 422);
        }

        const ok = await verify(target.password, currentPassword);
        if (!ok) throw new CustomError('ERRORS.USER.CURRENT_PASSWORD_INVALID', 422);
      }

      const hashed = await hashPassword(newPassword);

      await withTransaction(async (t) => {
        const [affected] = await User.update(
          { password: hashed },
          { where: { id: userId }, transaction: t, individualHooks: true }
        );
        if (affected !== 1) {
          throw new CustomError('ERRORS.USER.PASSWORD_NOT_CHANGED', 409);
        }
        await RefreshToken.destroy({ where: { userId }, transaction: t });
      });

      res.status(200).send({ code: 'USER.PASSWORD_CHANGED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.PASSWORD_NOT_CHANGED';
      next(error);
    }
  }
);

router.post(
  '/update-user',
  requireAuth,
  requireOperation('EDIT_USER'),
  validateRequest(userSchemas.updateUserDataSchema, 'body'),
  async (req, res) => {
    const { id, changes, restoringData, outdatingData, deletingData } = req.body;

    try {
      const result = await withTransaction(async (t) => {
        const user = await User.findByPk(id, { transaction: t });
        if (!user) throw new CustomError('ERRORS.USER.NOT_FOUND', 404);
        // CHANGES
        // main
        if (changes?.main) {
          console.log('changes?.main', changes?.main);
          const payload = changes.main;
          if (Object.keys(payload).length > 0) {
            await User.update(
              payload,
              {
                where: { id },
                transaction: t,
                individualHooks: true
              });
          }
        }

        // address
        if (changes?.address) {
          const a = changes.address;
          const hasAny = a.countryId || a.regionId || a.districtId || a.localityId;
          if (hasAny) {
            await UserAddress.create(
              {
                userId: id,
                countryId: a.countryId ?? null,
                regionId: a.regionId ?? null,
                districtId: a.districtId ?? null,
                localityId: a.localityId ?? null,
              },
              { transaction: t }
            );
          }
        }

        // contacts
        if (changes?.contacts) {
          const contactRows = Object.entries(changes.contacts)
            .flatMap(([type, list]) =>
              (list ?? [])
                .map(v => (v ?? '').trim())
                .filter(Boolean)
                .map(content => ({ userId: id, type, content }))
            );
          if (contactRows.length) {
            await UserContact.bulkCreate(contactRows, { individualHooks: true, transaction: t });
          }
        }

        // RESTORING
        if (restoringData?.addresses?.length) {
          const nonRecoverableAddr = await UserAddress.count(
            {
              where: {
                id: { [Op.in]: restoringData.addresses },
                isRecoverable: false
              }
            },
          );
          if (nonRecoverableAddr !== 0) throw CustomError('ERROR.USER.ADDRESS_NOT_RESTORED', 500);
          await UserAddress.update(
            { isRestricted: false },
            {
              where: { id: { [Op.in]: restoringData.addresses } },
              individualHooks: true, transaction: t
            }
          );
        }

        if (restoringData?.names?.length) {
          await OutdatedName.destroy({
            where: { id: { [Op.in]: restoringData.names } },
            transaction: t,
            individualHooks: true,
          });
        }

        if (restoringData?.userNames?.length) {
          await OutdatedName.destroy({
            where: { id: { [Op.in]: restoringData.userNames } },
            transaction: t,
            individualHooks: true,
          });
        }

        if (restoringData?.contacts) {
          const ids = Object.values(restoringData.contacts)
            .flatMap(arr => arr ?? [])
            .map(c => c.id);
          if (ids.length) {
            await UserContact.update(
              { isRestricted: false },
              { where: { id: { [Op.in]: ids } }, individualHooks: true, transaction: t }
            );
          }
        }

        // OUTDATING
        if (outdatingData?.names) {
          await OutdatedName.create(
            {
              userId: id,
              firstName: outdatingData.names.firstName,
              patronymic: outdatingData.names.patronymic,
              lastName: outdatingData.names.lastName,
            },
            { transaction: t }
          );
        }

        if (outdatingData?.userName) {
          await OutdatedName.create(
            { userId: id, userName: outdatingData.userName },
            { transaction: t }
          );
        }

        if (outdatingData?.address) {
          await UserAddress.update(
            { isRestricted: true },
            { where: { id: outdatingData.address }, individualHooks: true, transaction: t }
          );
        }

        if (outdatingData?.contacts?.length) {
          await UserContact.update(
            { isRestricted: true },
            { where: { id: { [Op.in]: outdatingData.contacts } }, individualHooks: true, transaction: t }
          );
        }

        // DELETING
        if (deletingData?.addresses?.length) {
          await UserAddress.destroy({
            where: { id: { [Op.in]: deletingData.addresses } },
            transaction: t,
            individualHooks: true,
          });
        }

        if (deletingData?.contacts?.length) {
          await UserContact.destroy({
            where: { id: { [Op.in]: deletingData.contacts } },
            transaction: t,
            individualHooks: true,
          });
        }

        if (deletingData?.names?.length) {
          await OutdatedName.destroy({
            where: { id: { [Op.in]: deletingData.names } },
            transaction: t,
            individualHooks: true,
          });
        }

        if (deletingData?.userNames?.length) {
          await OutdatedName.destroy({
            where: { id: { [Op.in]: deletingData.userNames } },
            transaction: t,
            individualHooks: true,
          });
        }

        // UPDATED USER
        const fresh = await User.findOne({
          where: { id },
          attributes: { exclude: ['password', 'failedLoginCount', 'lockedUntil', 'bruteWindowStart', 'bruteStrikeCount', 'createdAt', 'updatedAt'] },
          include: [
            { model: Role, attributes: ['name'] },
            { model: UserContact, as: 'contacts', attributes: ['id', 'type', 'content', 'isRestricted'] },
            {
              model: UserAddress, as: 'addresses', attributes: ['id', 'isRestricted', 'isRecoverable'],
              include: [
                { model: Country, attributes: ['id', 'name'] },
                { model: Region, attributes: ['id', 'shortName', 'name'] },
                { model: District, attributes: ['id', 'shortName', 'name'] },
                { model: Locality, attributes: ['id', 'shortName', 'name'] },
              ]
            },
            { model: OutdatedName, as: 'outdatedNames', attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName'] },
          ],
          transaction: t,
        });

        // SEARCH
        const search = ctrl.createSearchString(fresh);
        await SearchUser.update(
          { content: search },
          { where: { userId: id, isRestricted: false }, individualHooks: true, transaction: t }
        );

        const outdatedSearch = ctrl.createOutdatedSearchString(fresh);
        if (outdatedSearch) {
          /*           await SearchUser.upsert(
                      { userId: id, isRestricted: true, content: outdatedSearch },
                      { transaction: t }
                    ); */

          const [row, created] = await SearchUser.findOrCreate({
            where: { userId: id, isRestricted: true },
            defaults: { content: outdatedSearch },
            transaction: t
          });
          if (!created) await row.update({ content: outdatedSearch }, { individualHooks: true, transaction: t });
        }
        return ctrl.transformUserData(fresh.toJSON());
      });

      res.status(200).send({ code: 'USER.UPDATED', data: result });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_UPDATED';
      next(error);
    }
  }
);

// API get users

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
      } = req.body; // already validated by Zod

      const includeOutdated = !!view?.includeOutdated; // false => only actual
      const order = ctrl.buildOrder(sort);

      // ---- base where (User) ----
      const whereUser = {};
      const whereAddress = {};
      const whereContact = {};

      // view option (if you still use it)
      switch (view?.option) {
        case 'only-active': whereUser.isRestricted = false; break;
        case 'only-blocked': whereUser.isRestricted = true; break;
        default:              /* 'all' or undefined */        break;
      }

      // general filters
      if (filters?.general?.roles?.length) {
        whereUser.roleId = { [Op.in]: filters.general.roles };
      }

      if (filters?.general?.comment !== undefined) {
        whereUser.comment = !filters.general.comment ? null : { [Op.not]: null };
      }

      if (filters?.general?.dateBeginningRange) {
        whereUser.dateOfStart = ctrl.betweenDatesInclusive(filters.general.dateBeginningRange);
      }
      if (filters?.general?.dateRestrictionRange) {
        whereUser.dateOfRestriction = ctrl.betweenDatesInclusive(filters.general.dateRestrictionRange);
      }

      // contact types filter (weak/strong)
      const contactTypes = filters?.general?.contactTypes ?? [];
      const contRequired = contactTypes.length > 0;
      if (contRequired) {
        const sub = ctrl.buildContactUserIdSubquery(contactTypes, includeOutdated ? true : false, !!filters?.mode?.strictContact);
        if (!includeOutdated) whereContact.isRestricted = false;
        if (sub) whereContact.userId = { [Op.in]: sub };
      }

      // address filter (weak/strong)
      const addresses = filters?.address || {};
      const addrRequired = (addresses.countries?.length ?? 0) > 0;
      if (addrRequired) {
        const sub = await ctrl.buildAddressUserIdSubquery(addresses, includeOutdated ? true : false, !!filters?.mode?.strictAddress);
        if (!includeOutdated) whereAddress.isRestricted = false;
        if (sub) whereAddress.userId = { [Op.in]: sub };
      }

      // ---- includes (contacts / addresses / outdated names / search) ----
      const includes = [
        { model: Role, attributes: ['name'] },
        {
          model: UserContact,
          as: 'contacts',
          required: contRequired,
          attributes: ['id', 'type', 'content', 'isRestricted'],
          where: whereContact
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
          ]
        },
        {
          model: OutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName'],
          separate: true,
        }
      ];

      // search by SearchUser.content (words; exact → AND; else OR)
      if (search?.value?.trim()) {
        const contentWhere = ctrl.buildSearchContentWhere(search.value, search.exact);
        includes.push({
          model: SearchUser,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          }
        });
      }

      // ---- count (distinct) ----
      const total = await User.count({
        where: whereUser,
        include: includes,
        distinct: true,
      });

      console.log('whereUser', whereUser);
      /*    console.log('order', order);
     console.log('includes', includes);
     console.log('whereUser', whereUser); */

      // ---- page ----
      const users = await User.findAll({
        where: whereUser,
        attributes: { exclude: ['password', 'failedLoginCount', 'lockedUntil', 'bruteWindowStart', 'bruteStrikeCount', 'createdAt', 'updatedAt'] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
        // subQuery: false, // avoid subquery limits in includes
        distinct: true,
      });
      // console.log('users', users);

      const items = users.map(u => ctrl.transformUserData(u.toJSON()));
      res.status(200).send({ data: { users: items, length: total } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.LIST_FAILED';
      next(error);
    }
  }
);

router.get("/get-user-by-id/:id",
  requireAuth,
  requireAny('VIEW_USER', 'EDIT_USER'),
  validateRequest(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'failedLoginCount', 'lockedUntil', 'bruteWindowStart', 'bruteStrikeCount', 'createdAt', 'updatedAt'] },
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
            ]
          },
          {
            model: Role,
            attributes: ['name'],
          },
          {
            model: OutdatedName, as: 'outdatedNames',
            attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName']
          },
        ],
      });
      if (!user) throw new CustomError('ERRORS.USER.NOT_FOUND', 404);
      const data = ctrl.transformUserData(user.toJSON());
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_FOUND';
      next(error);
    }
  });

router.get(
  "/check-user-before-delete/:id",
  requireAuth,
  requireOperation('DELETE_USER'),
  validateRequest(z.object({ id: z.coerce.number().int().positive() }), 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const user = await User.findByPk(id);
      if (!user) throw new CustomError('ERRORS.USER.NOT_FOUND', 404);

      //TODO: find does this user has volunteers and orders
      const [countVolunteers, countOrders] = await Promise.all([
        /*         Volunteer.count({
                  where: {userId: id}
                }),
                Order.count({
                  where: {userId: id}
                }) */
      ]);
      const count = (countVolunteers ?? 0) + (countOrders ?? 0);
      const response = {
        data: count,
        ...(count ? { code: 'USER.HAS_DEPENDENCIES' } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_CHECKED';
      next(error);
    }
  });

router.delete(
  "/delete-user/:id",
  requireAuth,
  requireOperation('DELETE_USER'),
  validateRequest(userSchemas.userIdSchema, 'params'),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (t) => {
        // 1) Ensure the user exists
        const user = await User.findByPk(id, { transaction: t });
        if (!user) throw new CustomError('ERRORS.USER.NOT_FOUND', 404);

        // 2) Clean non-cascaded side tables (if any)
        await RefreshToken.destroy({ where: { userId: id }, transaction: t });

        // 3) Delete the user (DB will cascade child tables)
        const destroyed = await User.destroy({
          where: { id },
          transaction: t,
          individualHooks: true, // will run user-level hooks; children won't fire via DB cascade
        });
        if (destroyed !== 1) throw new CustomError('ERRORS.USER.NOT_FOUND', 404);
      });
      res.status(200).send({ code: 'USER.DELETED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_DELETED';
      next(error);
    }
  });

router.patch(
  '/block-user',
  requireAuth,
  requireAny('BLOCK_USER'),
  validateRequest(userSchemas.userBlockingSchema, 'body'),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (t) => {
        // 1) Block the user
        const [affected] = await User.update(
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
          throw new CustomError('ERRORS.USER.NOT_FOUND', 404);
        }

        // 2) Revoke refresh tokens (log out everywhere)
        await RefreshToken.destroy({
          where: { userId: id },
          transaction: t,
        });
      });

      res.status(200).send({ code: 'USER.BLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_BLOCKED';
      next(error);
    }
  }
);

router.patch(
  "/unblock-user",
  requireAuth,
  requireAny('UNBLOCK_USER'),
  validateRequest(userSchemas.userIdSchema, 'body'),
  async (req, res, next) => {
    try {
      let id = req.body.id;
      const [affected] = await User.update(
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
        throw new CustomError('ERRORS.USER.NOT_FOUND', 404);
      }
      res.status(200).send({ code: 'USER.UNBLOCKED', data: null });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.USER.NOT_UNBLOCKED';
      next(error);
    }
  });
export default router;



