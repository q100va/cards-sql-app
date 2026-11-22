import { Op } from "sequelize";
import { Senior, SeniorSearch } from "../models/index.js";
import { INCLUDES } from "../routes/seniors-api.js";
import { createSearchStringFor } from "./ctrl-search-string.js";
import CustomError from "../shared/customError.js";

export async function validateBulkSeniors(homeId, admitted, removed, updated, transaction) {
  const removedIds = new Set(removed.map(({ id }) => id));
  const updatedIds = new Set(updated.map(({ seniorId }) => seniorId));
  if (
    admitted.some((senior) => senior.homeId !== homeId) ||
    removedIds.has(undefined) ||
    removedIds.size !== removed.length ||
    updatedIds.size !== updated.length
  ) {
    throw new CustomError('ERRORS.CONFLICT', 409);
  }

  const seniorIds = [...new Set([...removedIds, ...updatedIds])];
  if (!seniorIds.length) return seniorIds;

  const seniors = await Senior.findAll({
    attributes: ['id'],
    where: { homeId, id: { [Op.in]: seniorIds } },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (seniors.length !== seniorIds.length) {
    throw new CustomError('ERRORS.CONFLICT', 409);
  }

  return seniorIds;
}

export async function addNewSeniors(admitted, dateOfUpdate, transaction) {
  if (!admitted?.length) {
    return 0;
  }

  admitted.forEach(s => s.dateOfStart = dateOfUpdate);

  const created = await Senior.bulkCreate(admitted, {
    transaction,
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
    transaction,
  });

  if (freshSeniors.length !== created.length) {
    throw new CustomError('ERRORS.SENIOR.FRESH_LIST_COUNT_MISMATCH', 500);
  }

  const searchRows = freshSeniors.map((freshSenior) => ({
    seniorId: freshSenior.id,
    content: createSearchStringFor('senior', freshSenior),
  }));

  const createdSearchRows = await SeniorSearch.bulkCreate(searchRows, {
    transaction,
  });

  if (createdSearchRows.length !== searchRows.length) {
    throw new CustomError('ERRORS.SENIOR.SEARCH_CREATE_COUNT_MISMATCH', 500);
  }

  return created.length;
}

export async function removeSeniors(removed, dateOfExit, homeId, transaction) {
  if (!removed?.length) {
    return 0;
  }
  const ids = removed.map((s) => s.id);

  const [removedCount] = await Senior.update(
    { dateOfExit },
    {
      where: { homeId, id: { [Op.in]: ids } },
      individualHooks: true,
      transaction,
    });

  if (removedCount !== removed.length) {
    throw new CustomError('ERRORS.CONFLICT', 409);
  }

  return removedCount;
}

export async function updateSeniors(updated, homeId, transaction) {
  let updatedCount = 0;
  for (const data of updated) {
    const [affectedCount] = await Senior.update(
      data.changes,
      {
        where: { homeId, id: data.seniorId },
        individualHooks: true,
        transaction,
      });
    if (affectedCount !== 1) {
      throw new CustomError('ERRORS.CONFLICT', 409);
    }
    updatedCount += affectedCount;
  }

  return updatedCount;
}

