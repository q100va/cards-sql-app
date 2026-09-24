import { Router } from "express";
import { Op, fn, col, where, literal } from "sequelize";
import { z } from "zod";

import {
  Country,
  Region,
  District,
  Locality,
  Senior,
  SeniorSearch,
  SeniorOutdatedName,
  HomeAddress,
  Home,
  HomeUpdateDate,
  Occasion,
  Recipient,
} from "../models/index.js";

import requireAuth from "../middlewares/check-auth.js";
import {
  requireOperation,
  requireAny,
} from "../middlewares/require-permission.js";
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";

import * as seniorSchemas from "../../shared/dist/schemas/senior.schema.js";
import * as homeSchemas from "../../shared/dist/schemas/home.schema.js";

import { withTransaction } from "../controllers/with-transaction.js";
import { fullName } from "../controllers/ctrl-create-owner-contacts-address.js";
import {
  createSearchStringFor,
  createOutdatedSearchStringFor,
} from "../controllers/ctrl-search-string.js";
import {
  buildOrderFor,
  betweenDatesInclusive,
  buildAddressOwnerIdSubquery,
  buildSearchContentWhere,
} from "../controllers/ctrl-owner-query-builders.js";
import { transformOwnerData } from "../controllers/ctrl-transform-owner.js";
import { applyOwnerUpdates } from "../controllers/ctrl-apply-owner-updates.js";

import { applyBirthDatePartsFilters } from "../controllers/ctrl-birth-date-query-builders.js";
import { getPotentialRecipients } from "../controllers/ctrl-potential-recipients.js";
import { syncRecipientsAfterSeniorUpdate } from "../controllers/ctrl-sync-recipients.js";
import { compareSeniorLists } from "../controllers/ctrl-compare-seniors-lists.js";
import {
  addNewSeniors,
  removeSeniors,
  updateSeniors,
} from "../controllers/ctrl-update-seniors-list.js";
import {
  addRecipients,
  markAbsentRecipients,
} from "../controllers/ctrl-check-recipients.js";

const router = Router();
export const INCLUDES = [
  {
    model: Home,
    as: "home",
    attributes: [
      "id",
      "homeName",
      "noAddress",
      "specialHome",
      "acceptableForSchool",
      "isRestricted",
      "dateOfRestriction",
      "causeOfRestriction",
      "isClose",
      "dateOfClose",
    ],
    include: [
      {
        model: HomeAddress,
        as: "activeAddress",
        attributes: ["id", "fullPostalAddress", "isRestricted"],
        where: { isRestricted: false },
        required: true,
        include: [
          { model: Country, attributes: ["id", "name"] },
          { model: Region, attributes: ["id", "shortName", "name"] },
          { model: District, attributes: ["id", "shortName", "name"] },
          { model: Locality, attributes: ["id", "shortName", "name"] },
        ],
      },
    ],
  },
  {
    model: SeniorOutdatedName,
    as: "outdatedNames",
    attributes: ["id", "firstName", "patronymic", "lastName"],
  },
  {
    model: Senior,
    as: "spouse",
    attributes: ["id", "firstName", "patronymic", "lastName", "birthDate"],
  },
];

router.post(
  "/check-senior-data",
  requireAuth,
  requireAny("ADD_NEW_SENIOR", "EDIT_SENIOR"),
  validateRequest(seniorSchemas.checkSeniorDataSchema, "body"),
  async (req, res, next) => {
    try {
      const senior = req.body;
      const excludeSelf = senior.id ? { id: { [Op.ne]: senior.id } } : {};

      const whereClause = {
        ...excludeSelf,
        homeId: senior.homeId,
        firstName: { [Op.iLike]: senior.firstName },
      };

      whereClause.patronymic =
        senior.patronymic == null
          ? { [Op.is]: null }
          : { [Op.iLike]: senior.patronymic };

      whereClause.lastName =
        senior.lastName == null
          ? { [Op.is]: null }
          : { [Op.iLike]: senior.lastName };

      whereClause.birthDate =
        senior.birthDate == null
          ? { [Op.is]: null }
          : senior.birthDate;

      const nameRows = await Senior.findAll({
        where: whereClause,
        attributes: ["firstName", "patronymic", "lastName", "birthDate"],
        raw: true,
      });
      const duplicatesName = nameRows.map(
        (row) => fullName(row) + (row.birthDate ? " " + row.birthDate : ""),
      );

      let response = { data: { duplicatesName } };
      if (duplicatesName.length > 0) {
        response.code = "ERRORS.SENIOR.HAS_DATA_DUPLICATES";
      }
      res.status(200).send(response);
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_CHECK_FAILED";
      next(error);
    }
  },
);

async function refreshSeniorSearch(seniorId, transaction) {
  const senior = await Senior.findByPk(seniorId, {
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: INCLUDES,
    transaction,
  });

  if (!senior) return;

  const content = createSearchStringFor('senior', senior);

  const [currentRow, currentCreated] = await SeniorSearch.findOrCreate({
    where: {
      seniorId,
      isRestricted: false,
    },
    defaults: {
      content,
    },
    transaction,
  });

  if (!currentCreated) {
    await currentRow.update(
      { content },
      { individualHooks: true, transaction },
    );
  }

  const outdatedContent =
    createOutdatedSearchStringFor('senior', senior);

  if (outdatedContent) {
    const [outdatedRow, outdatedCreated] =
      await SeniorSearch.findOrCreate({
        where: {
          seniorId,
          isRestricted: true,
        },
        defaults: {
          content: outdatedContent,
        },
        transaction,
      });

    if (!outdatedCreated) {
      await outdatedRow.update(
        { content: outdatedContent },
        { individualHooks: true, transaction },
      );
    }
  } else {
    await SeniorSearch.destroy({
      where: {
        seniorId,
        isRestricted: true,
      },
      transaction,
    });
  }
}

router.post(
  "/create-senior",
  requireAuth,
  requireOperation("ADD_NEW_SENIOR"),
  validateRequest(seniorSchemas.seniorDraftSchema, "body"),
  async (req, res, next) => {
    try {
      const creatingSenior = req.body;

      const result = await withTransaction(async (transaction) => {
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
            confirmedFirstName: creatingSenior.confirmedFirstName,
            confirmedPatronymic: creatingSenior.confirmedPatronymic,
            confirmedLastName: creatingSenior.confirmedLastName,
            confirmedBirthDate: creatingSenior.confirmedBirthDate,
            dateOfStart: creatingSenior.dateOfStart,
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
            dateOfExit: creatingSenior.dateOfExit,
            homeId: creatingSenior.homeId,
            spouseId: creatingSenior.spouseId,
          },
          { transaction },
        );

        // Keep spouse links symmetric and detach any previous spouse relationship.
        if (creatingSenior.spouseId) {
          const exSpouse = await Senior.findOne({
            where: {
              spouseId: creatingSenior.spouseId,
              id: { [Op.ne]: senior.id },
            },
            transaction,
          });
          if (exSpouse) {
            await Senior.update(
              { spouseId: null },
              {
                where: { id: exSpouse.id },
                transaction,
              },
            );
            await refreshSeniorSearch(exSpouse.id, transaction);
          }

          await Senior.update(
            { spouseId: senior.id },
            {
              where: { id: creatingSenior.spouseId },
              transaction,
            },
          );
          await refreshSeniorSearch(creatingSenior.spouseId, transaction);
        }

        await refreshSeniorSearch(senior.id, transaction);

        return fullName(senior);
      });

      res.status(201).send({ code: "SUCCESS.CREATED", data: result });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_CREATE_FAILED";
      next(error);
    }
  },
);

router.post(
  "/update-senior",
  requireAuth,
  requireOperation("EDIT_SENIOR"),
  validateRequest(seniorSchemas.updateSeniorDataSchema, "body"),
  async (req, res, next) => {
    const { id, changingData, restoringData, outdatingData, deletingData } =
      req.body;

    try {
      const result = await withTransaction(async (transaction) => {
        const senior = await Senior.findByPk(id, { transaction });
        if (!senior) throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);

        // Apply main-field changes and update spouse relationships.
        if (changingData?.main) {
          const spouseId = changingData.main.spouseId;
          if (spouseId !== undefined) {
            if (senior.spouseId) {
              await Senior.update(
                { spouseId: null },
                {
                  where: { id: senior.spouseId },
                  transaction,
                },
              );
              await refreshSeniorSearch(senior.spouseId, transaction);
            }

            if (spouseId !== null) {
              const exSpouse = await Senior.findOne({
                where: {
                  spouseId,
                  id: { [Op.ne]: id },
                },
                transaction,
              });
              if (exSpouse) {
                await Senior.update(
                  { spouseId: null },
                  {
                    where: { id: exSpouse.id },
                    transaction,
                  },
                );
                await refreshSeniorSearch(exSpouse.id, transaction);
              }

              await Senior.update(
                { spouseId: id },
                {
                  where: { id: spouseId },
                  transaction,
                },
              );

              await refreshSeniorSearch(spouseId, transaction);
            }
          }
          const payload = changingData.main;
          if (Object.keys(payload).length > 0) {
            await Senior.update(payload, {
              where: { id },
              transaction,
              individualHooks: true,
            });
            await syncRecipientsAfterSeniorUpdate(id, payload, transaction);
          }
        }

        // Apply outdated-name restore, archive, and delete operations.
        await applyOwnerUpdates(
          "senior",
          id,
          { changingData, restoringData, outdatingData, deletingData },
          transaction,
        );

        // Reload the updated senior with related data.
        const fresh = await Senior.findOne({
          where: { id },
          attributes: { exclude: ["createdAt", "updatedAt"] },
          include: INCLUDES,
          transaction,
        });

        await refreshSeniorSearch(id, transaction);

        return transformOwnerData("senior", fresh.toJSON());
      });
      res.status(200).send({ code: "SUCCESS.UPDATED", data: result });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_UPDATE_FAILED";
      next(error);
    }
  },
);

router.post(
  "/get-seniors",
  requireAuth,
  requireAny("VIEW_LIMITED_SENIORS_LIST", "VIEW_FULL_SENIORS_LIST"),
  validateRequest(seniorSchemas.seniorsQueryDTOSchema, "body"),
  async (req, res, next) => {
    try {
      const {
        page: { size: pageSize, number: pageNumber },
        sort,
        search,
        view,
        filters,
      } = req.body;

      // Search current data only unless outdated data is explicitly included.
      const includeOutdated = !!view?.includeOutdated;
      const order = buildOrderFor("senior", sort);

      const whereSenior = {};
      const whereAddress = {};
      const whereHome = {};
      whereAddress.isRestricted = false;

      // Filter by home status.
      switch (view?.homeOption) {
        case "only-active":
          whereHome.isRestricted = false;
          break;
        case "only-blocked":
          whereHome.isRestricted = true;
          whereHome.isClose = false;
          break;
        case "only-closed":
          whereHome.isClose = true;
          break;
        case "exclude-closed":
          whereHome.isClose = false;
          break;
        default:
          break;
      }
      // Apply senior-status filters unless closed homes are being viewed.
      if (view?.homeOption !== "only-closed") {
        switch (view?.option) {
          case "only-active": {
            whereSenior.isRestricted = false;
            break;
          }
          case "only-blocked": {
            whereSenior.isRestricted = true;
            whereSenior.dateOfExit = null;
            break;
          }
          case "only-discharged": {
            whereSenior.dateOfExit = { [Op.not]: null };
            break;
          }
          case "exclude-discharged": {
            whereSenior.dateOfExit = null;
            break;
          }

          default:
            break;
        }
      }

      // General filters
      if (filters?.general?.dateBeginningRange) {
        whereSenior.dateOfStart = betweenDatesInclusive(
          filters.general.dateBeginningRange,
        );
      }
      if (filters?.general?.dateRestrictionRange) {
        whereSenior.dateOfRestriction = betweenDatesInclusive(
          filters.general.dateRestrictionRange,
        );
      }
      if (filters?.general?.dateExitRange) {
        whereSenior.dateOfExit = betweenDatesInclusive(
          filters.general.dateExitRange,
        );
      }

      // Birth-date part filters apply only to seniors with a birth date.
      const hasAny =
        (filters?.general?.dayRange &&
          (filters?.general?.dayRange[0] != null ||
            filters?.general?.dayRange[1] != null)) ||
        (filters?.general?.monthRange &&
          (filters?.general?.monthRange[0] != null ||
            filters?.general?.monthRange[1] != null)) ||
        (filters?.general?.yearRange &&
          (filters?.general?.yearRange[0] != null ||
            filters?.general?.yearRange[1] != null));

      if (hasAny) {
        applyBirthDatePartsFilters(
          whereSenior,
          filters?.general?.hideWithoutYear ?? false,
          {
            dayRange: filters?.general?.dayRange,
            monthRange: filters?.general?.monthRange,
            yearRange: filters?.general?.yearRange,
          },
        );
      }
      if (filters?.general?.hideWithoutYear && !hasAny) {
        whereSenior.birthDate = {
          [Op.and]: [
            where(fn("DATE_PART", "year", col("senior.birthDate")), {
              [Op.not]: 1800,
            }),
            { [Op.not]: null },
          ],
        };
      }
      if (
        filters?.general?.hideWithoutBirthday &&
        !hasAny &&
        !filters?.general?.hideWithoutYear
      ) {
        whereSenior.birthDate = { [Op.not]: null };
      }

      if (
        filters?.general?.noAddress === true ||
        filters?.general?.noAddress === false
      ) {
        whereHome.noAddress = filters.general.noAddress;
      }
      if (
        filters?.general?.specialHome === true ||
        filters?.general?.specialHome === false
      ) {
        whereHome.specialHome = filters.general.specialHome;
      }
      if (
        filters?.general?.acceptableForSchool === true ||
        filters?.general?.acceptableForSchool === false
      ) {
        whereHome.acceptableForSchool = filters.general.acceptableForSchool;
      }
      if (filters?.general?.gender) {
        whereSenior.gender = filters.general.gender;
      }

      const details = filters?.general?.details || [];
      if (details.length > 0) {
        const strict = !!filters?.mode?.strictDetail;
        if (strict)
          whereSenior[Op.and] = details.map((detail) => ({
            [detail]: detail !== "personalNoAddr" ? { [Op.not]: null } : true,
          }));
        if (!strict)
          whereSenior[Op.or] = details.map((detail) => ({
            [detail]: detail !== "personalNoAddr" ? { [Op.not]: null } : true,
          }));
      }

      // Address filter: weak or strict matching
      const addresses = filters?.address || {};
      const addrRequired = [
        addresses.countries,
        addresses.regions,
        addresses.districts,
        addresses.localities,
      ].some((items) => (items?.length ?? 0) > 0);
      if (addrRequired) {
        const sub = await buildAddressOwnerIdSubquery(
          "senior",
          addresses,
          false,
          !!filters?.mode?.strictAddress,
        );
        if (sub) whereHome.id = { [Op.in]: sub };
      }

      // Home filter
      const homes = filters?.general?.homes || [];
      if (homes.length > 0) {
        if (whereHome.id) {
          whereHome.id = {
            [Op.and]: [whereHome.id, { [Op.in]: homes }],
          };
        } else {
          whereHome.id = { [Op.in]: homes };
        }
      }

      const includes = [
        {
          model: Home,
          as: "home",
          attributes: [
            "id",
            "homeName",
            "noAddress",
            "specialHome",
            "acceptableForSchool",
            "isRestricted",
            "dateOfRestriction",
            "causeOfRestriction",
            "isClose",
            "dateOfClose",
          ],
          where: whereHome,
          required: true,
          include: [
            {
              model: HomeAddress,
              as: "activeAddress",
              attributes: [
                "id",
                "fullPostalAddress",
                "isRestricted",
                "countryId",
                "regionId",
                "districtId",
                "localityId",
              ],
              where: whereAddress,
              required: true,
              include: [
                { model: Country, attributes: ["id", "name"] },
                { model: Region, attributes: ["id", "shortName", "name"] },
                { model: District, attributes: ["id", "shortName", "name"] },
                { model: Locality, attributes: ["id", "shortName", "name"] },
              ],
            },
          ],
        },
        {
          model: SeniorOutdatedName,
          as: "outdatedNames",
          attributes: ["id", "firstName", "patronymic", "lastName"],
          required: false,
        },
        {
          model: Senior,
          as: "spouse",
          attributes: ["id", "firstName", "patronymic", "lastName"],
          required: false,
        },
      ];

      // Search SeniorSearch content: exact requires all words, otherwise any word
      if (search?.value?.trim()) {
        const contentWhere = buildSearchContentWhere(
          search.value,
          search.exact,
        );
        includes.push({
          model: SeniorSearch,
          required: true,
          attributes: [],
          where: {
            ...(includeOutdated ? {} : { isRestricted: false }),
            ...(contentWhere || {}),
          },
        });
      }

      // Count distinct seniors
      const total = await Senior.count({
        where: whereSenior,
        include: includes,
        distinct: true,
      });

      // Fetch the requested page
      const seniors = await Senior.findAll({
        where: whereSenior,
        attributes: { exclude: ["createdAt", "updatedAt"] },
        order,
        include: includes,
        offset: pageSize * pageNumber,
        limit: pageSize,
      });
      const items = seniors.map((p) =>
        transformOwnerData("senior", p.toJSON()),
      );
      res.status(200).send({ data: { list: items, length: total } });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_FETCH_FAILED";
      next(error);
    }
  },
);

router.get(
  "/get-senior-by-id/:id",
  requireAuth,
  requireAny("VIEW_SENIOR", "EDIT_SENIOR"),
  validateRequest(seniorSchemas.seniorIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const senior = await Senior.findByPk(id, {
        attributes: { exclude: ["createdAt", "updatedAt"] },
        include: INCLUDES,
      });
      if (!senior) throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);
      const data = transformOwnerData("senior", senior.toJSON());
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_FETCH_FAILED";
      next(error);
    }
  },
);

// TODO: Exclude the current senior from spouse selection when editing.
router.get(
  "/get-list-of-seniors/:id",
  requireAuth,
  requireAny("VIEW_SENIOR", "EDIT_SENIOR", "ADD_NEW_SENIOR"),
  validateRequest(homeSchemas.homeIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const seniors = await Senior.findAll({
        attributes: { exclude: ["createdAt", "updatedAt"] },
        where: { dateOfExit: null, homeId: req.params.id },
      });

      const data = seniors.map((p) => ({ id: p.id, name: fullName(p) }));
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_FETCH_FAILED";
      next(error);
    }
  },
);

router.get(
  "/check-senior-before-delete/:id",
  requireAuth,
  requireOperation("DELETE_SENIOR"),
  validateRequest(seniorSchemas.seniorIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const senior = await Senior.findByPk(id);
      if (!senior) throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);

      const [countRecipients, countSpouse] = await Promise.all([
        Recipient.count({
          where: { seniorId: id },
        }),
        Senior.count({
          where: { spouseId: id },
        }),
      ]);
      const count = (countRecipients ?? 0) + (countSpouse ?? 0);
      const response = {
        data: count,
        ...(count ? { code: "ERRORS.SENIOR.HAS_DEPENDENCIES" } : null),
      };
      return res.status(200).json(response);
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_CHECK_FAILED";
      next(error);
    }
  },
);

router.delete(
  "/delete-senior/:id",
  requireAuth,
  requireOperation("DELETE_SENIOR"),
  validateRequest(seniorSchemas.seniorIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      await withTransaction(async (transaction) => {
        // Ensure the senior exists
        const senior = await Senior.findByPk(id, { transaction });
        if (!senior) throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);

        // Delete the senior (DB will cascade child tables)
        const destroyed = await Senior.destroy({
          where: { id },
          transaction,
          individualHooks: true,
        });
        if (destroyed !== 1) {
          throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);
        }
      });
      res.status(200).send({ code: "SUCCESS.DELETED", data: null });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_DELETE_FAILED";
      next(error);
    }
  },
);

router.patch(
  "/block-senior",
  requireAuth,
  requireOperation("BLOCK_SENIOR"),
  validateRequest(seniorSchemas.seniorBlockingSchema, "body"),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      const cause = req.body.causeOfRestriction;

      await withTransaction(async (transaction) => {
        const [affected] = await Senior.update(
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
          throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);
        }
        await syncRecipientsAfterSeniorUpdate(id, { isRestricted: true }, transaction);
        await refreshSeniorSearch(id, transaction);
      });

      res.status(200).send({ code: "SUCCESS.UPDATED", data: null });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_UPDATE_FAILED";
      next(error);
    }
  },
);

router.patch(
  "/unblock-senior",
  requireAuth,
  requireOperation("UNBLOCK_SENIOR"),
  validateRequest(seniorSchemas.seniorIdSchema, "body"),
  async (req, res, next) => {
    try {
      const id = req.body.id;
      await withTransaction(async (transaction) => {
        const [affected] = await Senior.update(
          {
            isRestricted: false,
            causeOfRestriction: null,
            dateOfRestriction: null,
          },
          {
            where: { id },
            individualHooks: true,
            transaction,
          },
        );
        if (affected !== 1) {
          throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);
        }
        await syncRecipientsAfterSeniorUpdate(id, { isRestricted: false }, transaction);
        await refreshSeniorSearch(id, transaction);
      });

      res.status(200).send({ code: "SUCCESS.UPDATED", data: null });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_UPDATE_FAILED";
      next(error);
    }
  },
);

router.get(
  "/get-seniors-for-occasion/:occasionId/:homeId",
  requireAuth,
  requireOperation("ADD_NEW_RECIPIENT"),
  validateRequest(
    z.object({
      occasionId: z.coerce.number().int().positive(),
      homeId: z.coerce.number().int().positive(),
    }),
    "params",
  ),
  async (req, res, next) => {
    try {
      const occasionId = req.params.occasionId;
      const occasion = await Occasion.findByPk(occasionId);
      if (!occasion) throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);

      const homeId = req.params.homeId;
      const data = await getPotentialRecipients(occasion, homeId);
      res.status(200).send({ data });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_FETCH_FAILED";
      next(error);
    }
  },
);

router.post(
  "/compare-seniors-lists",
  requireAuth,
  requireOperation("UPLOAD_LIST_OF_SENIORS"),
  validateRequest(
    z.object({
      newList: z.array(seniorSchemas.seniorPreSchema),
      homeName: z.string().trim().min(1),
      commentsMode: z.boolean(),
      chosenMonths: z.array(z.number()),
    }),
    "body",
  ),
  async (req, res, next) => {
    try {
      const { newList, homeName, commentsMode, chosenMonths } = req.body;
      const home = await Home.findOne({
        where: { homeName },
      });
      if (!home) throw new CustomError("ERRORS.DATA_NOT_FOUND", 404);
      const seniorWhere = {
        homeId: home.id,
      };

      if (chosenMonths.length) {
        seniorWhere[Op.and] = [
          where(fn("EXTRACT", literal('MONTH FROM "birthDate"')), {
            [Op.in]: chosenMonths,
          }),
        ];
      }
      const oldList = await Senior.findAll({
        where: seniorWhere,
      });
      const differences = compareSeniorLists(
        newList,
        oldList,
        home.id,
        commentsMode,
      );
      res
        .status(200)
        .send({
          code: "SUCCESS.DATA_CHECKED",
          data: { differences, homeId: home.id },
        });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_CHECK_FAILED";
      next(error);
    }
  },
);

router.post(
  "/update-seniors-list/",
  requireAuth,
  requireOperation("UPLOAD_LIST_OF_SENIORS"),
  validateRequest(seniorSchemas.bulkUpdateSchema, "body"),
  async (req, res, next) => {
    try {
      const { admitted, removed, updated, homeId, dateOfUpdate } = req.body;

      const result = await withTransaction(async (transaction) => {
        const createdCount = await addNewSeniors(admitted, dateOfUpdate, transaction);
        const removedCount = await removeSeniors(removed, dateOfUpdate, transaction);
        const updatedCount = await updateSeniors(updated, transaction);

        const changedSeniorIds = new Set([
          ...removed.map((senior) => senior.id),
          ...updated.map((senior) => senior.seniorId),
        ]);

        for (const seniorId of changedSeniorIds) {
          await refreshSeniorSearch(seniorId, transaction);
        }

        const activeOccasions = await Occasion.findAll({
          where: { status: 1 },
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
          transaction,
        });
        for (const occasion of activeOccasions) {
          await addRecipients(occasion, transaction, homeId);
          await markAbsentRecipients(occasion, transaction, homeId);
        }
        for (const seniorUpdate of updated) {
          if (
            seniorUpdate.changes.lastName !== undefined ||
            seniorUpdate.changes.firstName !== undefined ||
            seniorUpdate.changes.patronymic !== undefined ||
            seniorUpdate.changes.gender !== undefined ||
            seniorUpdate.changes.birthDate !== undefined
          ) {
            await syncRecipientsAfterSeniorUpdate(
              seniorUpdate.seniorId,
              seniorUpdate.changes,
              transaction);
          }
        }
        await HomeUpdateDate.update(
          {
            isLatest: false,
          },
          {
            where: {
              homeId,
              isLatest: true,
            },
            transaction,
          },
        );

        await HomeUpdateDate.create(
          {
            date: dateOfUpdate,
            homeId,
            userId: req.user.id,
            isLatest: true,
          },
          { transaction },
        );
        return { createdCount, removedCount, updatedCount };
      });

      res.status(200).send({ code: "SUCCESS.UPDATED", data: result });
    } catch (error) {
      error.code = error.code ?? "ERRORS.DATA_UPDATE_FAILED";
      next(error);
    }
  },
);

export default router;

// TODO: Decide whether the same senior should be treated as a duplicate across different homes.
