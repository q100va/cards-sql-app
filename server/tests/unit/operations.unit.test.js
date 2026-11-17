/** @jest-environment node */

import { objects, OPERATIONS, OPERATION_FLAG } from '../../shared/operations.js';

describe('operations configuration', () => {
  test('operation codes are unique', () => {
    const codes = OPERATIONS.map((operation) => operation.operation);

    expect(new Set(codes).size).toBe(codes.length);
  });

  test('every operation references a configured object', () => {
    for (const operation of OPERATIONS) {
      expect(objects).toContain(operation.object);
    }
  });

  test('every configured object has operations', () => {
    for (const object of objects) {
      expect(OPERATIONS.some((operation) => operation.object === object)).toBe(true);
    }
  });

  test('every object has exactly one ALL_OPS operation', () => {
    for (const object of objects) {
      const allOps = OPERATIONS.filter((operation) =>
        operation.object === object &&
        operation.accessToAllOps === true);

      expect(allOps).toHaveLength(1);
    }
  });

  test('every object has exactly one FULL and one LIMITED operation', () => {
    for (const object of objects) {
      const operations = OPERATIONS.filter((operation) => operation.object === object);

      const full = operations.filter((operation) => operation.flag === OPERATION_FLAG.FULL);

      const limited = operations.filter((operation) => operation.flag === OPERATION_FLAG.LIMITED);

      expect(full).toHaveLength(1);

      expect(limited).toHaveLength(1);
    }
  });

  test('FULL and LIMITED operations are not ALL_OPS operations', () => {
    const flagged = OPERATIONS.filter((operation) => operation.flag);

    for (const operation of flagged) {
      expect(operation.accessToAllOps).toBe(false);
    }
  });

  test('only supported operation flags are used', () => {
    const allowedFlags = new Set([OPERATION_FLAG.FULL, OPERATION_FLAG.LIMITED]);

    for (const operation of OPERATIONS) {
      if (operation.flag !== undefined) {
        expect(allowedFlags.has(operation.flag)).toBe(true);
      }
    }
  });

  test('required operation metadata is present', () => {
    for (const operation of OPERATIONS) {
      expect(operation.operation).toEqual(expect.any(String));

      expect(operation.operation.trim()).not.toBe('');

      expect(operation.object).toEqual(expect.any(String));

      expect(operation.operationName).toEqual(expect.any(String));

      expect(operation.operationName.trim()).not.toBe('');

      expect(operation.description).toEqual(expect.any(String));

      expect(operation.description.trim()).not.toBe('');

      expect(operation.objectName).toEqual(expect.any(String));

      expect(operation.objectName.trim()).not.toBe('');
    }
  });

  test('all operations for one object use the same objectName key', () => {
    for (const object of objects) {
      const objectNames = new Set(OPERATIONS.filter((operation) =>
        operation.object === object).map((operation) =>
          operation.objectName));

      expect(objectNames.size).toBe(1);
    }
  });
});
