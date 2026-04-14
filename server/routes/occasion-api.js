import { Router } from "express";
import Sequelize from "sequelize";
import Occasion from "../models/occasion.js";
import User from "../models/user.js";
import CustomError from "../shared/customError.js";
import { validateRequest } from "../middlewares/validate-request.js";
import * as occasionSchemas from "../../shared/dist/occasion.schema.js";
import { withTransaction } from "../controllers/with-transaction.js";
import requireAuth from '../middlewares/check-auth.js';
import { requireOperation, requireAny, requireAll } from '../middlewares/require-permission.js';

const Op = Sequelize.Op;
const router = Router();

/**
 * GET /check-occasion-name/:name
 * Check if a occasion with the given name already exists (case-insensitive).
 */
router.get(
  "/check-occasion-name/:name",
  requireAuth,
  requireAny('ADD_NEW_OCCASION', 'EDIT_OCCASION'),
  validateRequest(occasionSchemas.occasionNameSchema, "params"),
  async (req, res, next) => {
    try {
      const occasionName = req.params.name.toLowerCase();
      const duplicate = await Occasion.findOne({
        where: { name: { [Op.iLike]: occasionName } },
        attributes: ["name"],
        raw: true,
      });
      let response = {};
      response.data = duplicate !== null;
      if (duplicate !== null) response.code = 'OCCASION.ALREADY_EXISTS';
      res
        .status(200)
        .send(response);
    } catch (error) {
      error.code = 'ERRORS.OCCASION.NAME_NOT_CHECKED';
      next(error);
    }
  }
);

/**
 * POST /create-occasion
 * Create a new occasion and insert default operations for it.
 */
router.post(
  "/create-occasion",
  requireAuth,
  requireOperation('ADD_NEW_OCCASION'),
  validateRequest(occasionSchemas.occasionDraftSchema),
  async (req, res, next) => {
    try {
      const { name, date, month, year, isActive } = req.body;

      const occasionName = await withTransaction(async (t) => {
        // Create occasion
        const occasion = await Occasion.create({
          name,
          date,
          month,
          year,
          isActive
        }, { transaction: t });
        return occasion.name;
      });

      res.status(200).send({ code: 'OCCASION.CREATED', data: occasionName });
    } catch (error) {
      error.code = 'ERRORS.OCCASION.NOT_CREATED';
      next(error);
    }
  }
);

/**
 * GET /get-occasions
 * Return occasions and their operations with access/disabled flags.
 */
router.get(
  "/get-occasions",
  requireAuth,
  requireOperation('VIEW_LIMITED_OCCASIONS_LIST'),
  async (req, res, next) => {
    try {
      // Occasions
      const occasions = await Occasion.findAll({
        attributes: {
          exclude: [
            'createdAt',
            'updatedAt']
        },
        order: [["id", "DESC"]],
        raw: true,
      });

      const buildOptions = (items, keys) => {
        const result = {};

        for (const key of keys) {
          result[key] = [
            ...new Set(
              items
                .map(item => item[key])
                .filter(v => v !== null && v !== undefined)
            ),
          ].sort();
        }

        return result;
      };

      const options = buildOptions(occasions, [
        'name',
        'date',
        'month',
        'year',
        'type',
        'status',
      ]);

      options = {
        name: [],
        date: [],
        month: [],
        year: [],
        type: [],
        status: [],
      };



      res
        .status(200)
        .send({ data: { occasions, options: listOfOperations } });
    } catch (error) {
      error.code = 'ERRORS.OCCASION.LIST_FAILED';
      next(error);
    }
  }
);

export default router;
