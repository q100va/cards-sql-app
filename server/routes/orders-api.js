import { Router } from "express";
import { Op, Sequelize } from 'sequelize';
import { z } from 'zod';
import {
  Order, Region, Home, HomeAddress,
  VolunteerAddress, Volunteer, VolunteerContact, VolunteerSearch, VolunteerOutdatedName,
  VolunteerSubscription, VolunteerCooperation, Institute,
  User
} from "../models/index.js";
import requireAuth from "../middlewares/check-auth.js";
import { requireOperation, requireAny } from '../middlewares/require-permission.js';
import { validateRequest } from "../middlewares/validate-request.js";
import CustomError from "../shared/customError.js";
import * as volunteerSchemas from "../../shared/dist/schemas/volunteer.schema.js";


const router = Router();

router.get("/get-filters-data",
  requireAuth,
  requireAny('ADD_NEW_ORDER'),
  async (req, res, next) => {
    try {

      const regions = await Region.findAll({
        where: { isRestricted: false, countryId: 143 },
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
        raw: true
      });
      let homes = await Home.findAll({
        where: { isRestricted: false, isClose: false },
        attributes: ['id', 'homeName'],
        include: {
          model: HomeAddress,
          as: 'activeAddress',
          attributes: ['regionId'],
        },
        order: [['homeName', 'ASC']],
        raw: true
      });
      console.log('HOMES', homes);

      homes = homes.map(h => ({
        id: h.id,
        name: h.homeName,
        regionId: h['activeAddress.regionId']
      }));


      res.status(200).send({ data: { regions, homes } });
    } catch (error) {
      error.code = error.code ?? 'ERRORS.ORDER.FILTER_DATA_FAILED';
      next(error);
    }
  });

export default router;

