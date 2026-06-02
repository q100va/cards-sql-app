import { Op } from "sequelize";
import { Senior, SeniorSearch } from "../models/index.js";
import { INCLUDES } from "../routes/seniors-api.js";
import { createSearchStringFor } from "./ctrl-search-string.js";
import CustomError from "../shared/customError.js";

export async function addNewSeniors(admitted, dateOfUpdate, t) {
  if (!admitted?.length) {
    return 0;
  }

  admitted.forEach(s => s.dateOfStart = dateOfUpdate);

  const created = await Senior.bulkCreate(admitted, {
    transaction: t,
    individualHooks: true,
  });

  if (created.length !== admitted.length) {
    throw new CustomError('ERRORS.SENIOR.BULK_CREATE_COUNT_MISMATCH', 500);
  }

  const ids = created.map((s) => s.id);

  const freshSeniors = await Senior.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
    },
    include: INCLUDES,
    transaction: t,
  });

  if (freshSeniors.length !== created.length) {
    throw new CustomError('ERRORS.SENIOR.FRESH_LIST_COUNT_MISMATCH', 500);
  }

  const searchRows = freshSeniors.map((freshSenior) => ({
    seniorId: freshSenior.id,
    content: createSearchStringFor('senior', freshSenior),
  }));

  const createdSearchRows = await SeniorSearch.bulkCreate(searchRows, {
    transaction: t,
    individualHooks: true,
  });

  if (createdSearchRows.length !== searchRows.length) {
    throw new CustomError('ERRORS.SENIOR.SEARCH_CREATE_COUNT_MISMATCH', 500);
  }

  return created.length;
}

export async function removeSeniors(removed, dateOfExit, t) {
  if (!removed?.length) {
    return 0;
  }
  const ids = removed.map((s) => s.id);

  const [removedCount] = await Senior.update(
    { dateOfExit },
    {
      where: { id: { [Op.in]: ids } },
      transaction: t,
    });

  console.log('removedCount', removedCount)
  if (removedCount !== removed.length) {
    throw new CustomError('ERRORS.SENIOR.BULK_REMOVED_COUNT_MISMATCH', 500);
  }

  return removedCount;
}

export async function updateSeniors(updated, t) {
  if (!updated?.length) {
    return 0;
  }
  for (let data of updated) {
    await Senior.update(
      data.changes,
      {
        where: { id: data.seniorId },
        transaction: t,
      });
  }

  return updated.length;
}

