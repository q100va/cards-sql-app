// Express test setup
import express from "express";
import request from "supertest";
import { jest } from '@jest/globals';

// Fixed transaction object used in mocks
const fakeTx = { id: 'test-transaction' };

// Mock the transaction helper before importing the router
jest.unstable_mockModule('../controllers/with-transaction.js', () => ({
  withTransaction: async (fn) => fn(fakeTx),
}));

// Import router and models after mocks are in place
const { default: router } = await import('../routes/roles-api.js');
import Operation from '../models/operation.js';
import Role from "../models/role.js";
import User from "../models/user.js";
import { OPERATIONS } from "../shared/operations.js";

// Minimal app with JSON and the API router
const app = express();
app.use(express.json());
app.use("/", router);

describe("Role Routes", () => {
  // Clear spies/mocks between tests
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // Close ORM connections at the end
  afterAll(async () => {
    await Role.sequelize.close();
    await Operation.sequelize.close();
    await User.sequelize.close();
  });

  // GET /check-role-name/:name route
  describe("GET /check-role-name/:name", () => {
    it("returns true if role exists", async () => {
      // Given: role exists
      jest.spyOn(Role, "findOne").mockResolvedValue({ name: "admin" });

      // When
      const res = await request(app).get("/check-role-name/admin");

      // Then
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Проверка завершена.");
      expect(res.body.data).toBe(true);
    });

    it("returns false if role does not exist", async () => {
      // Given: role does not exist
      jest.spyOn(Role, "findOne").mockResolvedValue(null);

      // When
      const res = await request(app).get("/check-role-name/unknown");

      // Then
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Проверка завершена.");
      expect(res.body.data).toBe(false);
    });

    it("handles internal errors", async () => {
      // Given: DB throws
      jest.spyOn(Role, "findOne").mockRejectedValue(new Error("Check role name failure"));

      // When
      const res = await request(app).get("/check-role-name/error");

      // Then
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка при проверке названия роли.");
    });
  });

  // POST /create-role route
  describe("POST /create-role", () => {
    it("creates a role and bulk-inserts all operations using a transaction", async () => {
      // Given
      const roleData = { name: 'manager', description: 'Manages stuff' };
      jest.spyOn(Role, 'create').mockResolvedValue({
        id: 42,
        name: roleData.name,
        description: roleData.description,
      });
      const bulkMock = jest
        .spyOn(Operation, 'bulkCreate')
        .mockImplementation((rows) =>
          Promise.resolve(rows.map((r, i) => ({ ...r, id: 1000 + i })))
        );

      // When
      const res = await request(app).post('/create-role').send(roleData);

      // Then: response
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe('Роль успешно создана.');
      expect(res.body.data).toBe('manager');

      // Then: bulkCreate called once with the transaction
      expect(bulkMock).toHaveBeenCalledTimes(1);
      const [rowsArg, optsArg] = bulkMock.mock.calls[0];
      expect(optsArg).toBeDefined();
      expect(optsArg.transaction).toBe(fakeTx);

      // Then: rows are well-formed
      expect(Array.isArray(rowsArg)).toBe(true);
      expect(rowsArg.length).toBeGreaterThan(0);
      for (const r of rowsArg) {
        expect(r).toEqual(
          expect.objectContaining({
            name: expect.any(String),
            roleId: 42,
            access: false,
            disabled: expect.any(Boolean),
          })
        );
      }

      // Then: representative rules
      const byName = Object.fromEntries(rowsArg.map((r) => [r.name, r]));
      if (byName.ALL_OPS_PARTNERS) {
        expect(byName.ALL_OPS_PARTNERS.disabled).toBe(false);
      }
      if (byName.VIEW_FULL_PARTNERS_LIST) {
        expect(byName.VIEW_FULL_PARTNERS_LIST.disabled).toBe(true);
      }
      if (byName.VIEW_LIMITED_PARTNERS_LIST) {
        expect(byName.VIEW_LIMITED_PARTNERS_LIST.disabled).toBe(false);
      }

      // Then: all operations present, names match config
      expect(rowsArg.length).toBe(OPERATIONS.length);
      expect(rowsArg.map(r => r.name).sort())
        .toEqual(OPERATIONS.map(o => o.operation).sort());

      // Then: all access flags are false on creation
      const accessArgs = rowsArg.map(r => r.access);
      expect(accessArgs.length).toBe(OPERATIONS.length);
      expect(accessArgs.every((a) => a === false)).toBe(true);
    });

    it("returns 500 if role creation fails", async () => {
      // Given
      jest.spyOn(Role, "create").mockRejectedValue(new Error("Create role failure"));
      const roleData = { name: "failure", description: "This will fail" };

      // When
      const res = await request(app).post("/create-role").send(roleData);

      // Then
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка. Роль не создана");
    });
  });

  describe("PATCH /update-role", () => {
    it("updates an existing role's name/description", async () => {
      // Given
      const updatedRole = { id: 1, name: "newName", description: "newDescription" };
      jest.spyOn(Role, "update").mockResolvedValue([1, [updatedRole]]);

      // When
      const res = await request(app).patch("/update-role").send(updatedRole);

      // Then
      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Роль успешно обновлена.");
      expect(res.body.data.name).toBe("newName");
    });

    it("returns 404 when role is not found", async () => {
      // Given
      jest.spyOn(Role, "update").mockResolvedValue([0, [null]]);
      const roleData = { id: 999, name: "nonexistent", description: "none" };

      // When
      const res = await request(app).patch("/update-role").send(roleData);

      // Then
      expect(res.statusCode).toBe(404);
      expect(res.text).toBe("Обновление невозможно. Роль не найдена.");
    });

    it("handles internal errors", async () => {
      // Given
      jest.spyOn(Role, "update").mockRejectedValue(new Error("Update role failure"));
      const roleData = { id: 1, name: "errorName", description: "errorDescription" };

      // When
      const res = await request(app).patch("/update-role").send(roleData);

      // Then
      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка. Роль не обновлена.");
    });
  });

  // PATCH /update-role-access
  describe("PATCH /update-role-access", () => {
    it("disables VIEW_FULL, keeps VIEW_LIMITED enabled, and disables ALL_OPS when turning off full view access", async () => {
      const payload = {
        access: false,
        roleId: 2,
        operation: {
          operation: "VIEW_FULL_PARTNERS_LIST",
          object: "partners",
          accessToAllOps: false,
          flag: "FULL",
          description: "просмотреть с полным доступом к данным списка контрагентов",
          objectName: "представители\nинтернатов",
          operationName: "доступ к доп. данным списка",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 200, roleId: 2, access: true, disabled: false }
          ]
        }
      };

      jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        switch (options?.where?.name) {
          case "VIEW_FULL_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 200, roleId: 2, access: false, disabled: true }]]);
          case "VIEW_LIMITED_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 201, roleId: 2, access: true, disabled: false }]]);
          case "ALL_OPS_PARTNERS":
            return Promise.resolve([1, [{ id: 202, roleId: 2, access: false, disabled: false }]]);
          default:
            return Promise.resolve([0, []]);
        }
      });

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Роль успешно обновлена.");
      expect(res.body.data.ops).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 200, roleId: 2, access: false, disabled: true }),
          expect.objectContaining({ id: 201, roleId: 2, access: true, disabled: false }),
          expect.objectContaining({ id: 202, roleId: 2, access: false, disabled: false })
        ])
      );
    });

    it("enables ALL_OPS and marks VIEW_LIMITED as disabled when VIEW_FULL is turned on and all related operations already have access", async () => {
      const payload = {
        access: true,
        roleId: 2,
        operation: {
          operation: "VIEW_FULL_PARTNERS_LIST",
          object: "partners",
          accessToAllOps: false,
          flag: "FULL",
          description: "просмотреть с полным доступом к данным списка контрагентов",
          objectName: "представители\nинтернатов",
          operationName: "доступ к доп. данным списка",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 200, roleId: 2, access: false, disabled: false }
          ]
        }
      };

      // Related operations already enabled
      jest.spyOn(Operation, "findOne").mockResolvedValue(null);

      jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        switch (options?.where?.name) {
          case "VIEW_FULL_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 200, roleId: 2, access: true, disabled: false }]]);
          case "VIEW_LIMITED_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 201, roleId: 2, access: true, disabled: true }]]);
          case "ALL_OPS_PARTNERS":
            return Promise.resolve([1, [{ id: 202, roleId: 2, access: true, disabled: false }]]);
          default:
            return Promise.resolve([0, []]);
        }
      });

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Роль успешно обновлена.");
      expect(res.body.data.ops).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 202, roleId: 2, access: true, disabled: false }),
          expect.objectContaining({ id: 201, roleId: 2, access: true, disabled: true }),
          expect.objectContaining({ id: 200, roleId: 2, access: true, disabled: false })
        ])
      );
      expect(Operation.findOne).toHaveBeenCalled();
    });

    it("keeps ALL_OPS disabled when turning on a single operation while another related operation still has access=false", async () => {
      const payload = {
        access: true,
        roleId: 2,
        operation: {
          operation: "ADD_NEW_PARTNER",
          object: "partners",
          accessToAllOps: false,
          description: "добавить нового контрагента",
          objectName: "представители\nинтернатов",
          operationName: "создать",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 193, roleId: 2, access: false, disabled: false }
          ]
        }
      };

      // Simulate a related operation with access=false
      const findOneMock = jest.spyOn(Operation, "findOne");
      findOneMock.mockResolvedValueOnce({ id: 999 }).mockResolvedValue(null);

      const updateSpy = jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        switch (options?.where?.name) {
          case "ADD_NEW_PARTNER":
            return Promise.resolve([1, [{ id: 193, roleId: 2, access: true, disabled: false }]]);
          case "ALL_OPS_PARTNERS":
            throw new Error("ALL_OPS_PARTNERS must NOT be updated when not all related ops are enabled");
          default:
            return Promise.resolve([0, []]);
        }
      });

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Роль успешно обновлена.");
      expect(res.body.data.ops).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 193, roleId: 2, access: true, disabled: false })
        ])
      );
      expect(res.body.data.ops).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 202, access: true })])
      );
      expect(updateSpy.mock.calls.find(([, opts]) => opts?.where?.name === "ALL_OPS_PARTNERS")).toBeUndefined();
      expect(Operation.findOne).toHaveBeenCalled();
    });

    it("enables ALL_OPS and turns on all related operations (VIEW_FULL on, VIEW_LIMITED stays enabled but disabled=true)", async () => {
      const payload = {
        access: true,
        roleId: 2,
        operation: {
          operation: "ALL_OPS_PARTNERS",
          object: "partners",
          accessToAllOps: true,
          description: "полный доступ ко всем операциям с данными контрагентов",
          objectName: "представители\nинтернатов",
          operationName: "полный доступ ко всем операциям",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 299, roleId: 2, access: false, disabled: false }
          ]
        }
      };

      const updateSpy = jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        switch (options?.where?.name) {
          case "ADD_NEW_PARTNER":
            return Promise.resolve([1, [{ id: 299, roleId: 2, access: true, disabled: false }]]);
          case "ALL_OPS_PARTNERS":
            return Promise.resolve([1, [{ id: 300, roleId: 2, access: true, disabled: false }]]);
          case "VIEW_FULL_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 301, roleId: 2, access: true, disabled: false }]]);
          case "VIEW_LIMITED_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 302, roleId: 2, access: true, disabled: true }]]);
          default:
            return Promise.resolve([1, [{ roleId: 2, access: true, disabled: false }]]);
        }
      });

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Роль успешно обновлена.");
      expect(res.body.data.ops).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 299, access: true, disabled: false }),
          expect.objectContaining({ id: 300, access: true, disabled: false }),
          expect.objectContaining({ id: 301, access: true, disabled: false }),
          expect.objectContaining({ id: 302, access: true, disabled: true })
        ])
      );
      expect(updateSpy.mock.calls.map(([, opts]) => opts?.where?.name)).toEqual(
        expect.arrayContaining(["ADD_NEW_PARTNER"])
      );
      const accessArgs = updateSpy.mock.calls.map(([values]) => values?.access).filter(Boolean);
      expect(accessArgs.every((a) => a === true)).toBe(true);
    });

    it("disables ALL_OPS and sets all related operations to access=false (VIEW_FULL marked disabled)", async () => {
      const payload = {
        access: false,
        roleId: 2,
        operation: {
          operation: "ALL_OPS_PARTNERS",
          object: "partners",
          accessToAllOps: true,
          description: "полный доступ ко всем операциям с данными контрагентов",
          objectName: "представители\nинтернатов",
          operationName: "полный доступ ко всем операциям",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 299, roleId: 2, access: true, disabled: false }
          ]
        }
      };

      const updateSpy = jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        switch (options?.where?.name) {
          case "ADD_NEW_PARTNER":
            return Promise.resolve([1, [{ id: 299, roleId: 2, access: false, disabled: false }]]);
          case "ALL_OPS_PARTNERS":
            return Promise.resolve([1, [{ id: 300, roleId: 2, access: false, disabled: false }]]);
          case "VIEW_FULL_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 301, roleId: 2, access: false, disabled: true }]]);
          case "VIEW_LIMITED_PARTNERS_LIST":
            return Promise.resolve([1, [{ id: 302, roleId: 2, access: false, disabled: false }]]);
          default:
            return Promise.resolve([1, [{ roleId: 2, access: false, disabled: false }]]);
        }
      });

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Роль успешно обновлена.");
      expect(res.body.data.ops).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 299, access: false, disabled: false }),
          expect.objectContaining({ id: 300, access: false, disabled: false }),
          expect.objectContaining({ id: 301, access: false, disabled: true }),
          expect.objectContaining({ id: 302, access: false, disabled: false })
        ])
      );
      expect(updateSpy.mock.calls.map(([, opts]) => opts?.where?.name)).toEqual(
        expect.arrayContaining(["ADD_NEW_PARTNER"])
      );
      const accessArgs = updateSpy.mock.calls.map(([values]) => values?.access).filter((v) => v !== undefined);
      expect(accessArgs.every((a) => a === false)).toBe(true);
    });

    it("handles errors in update-role-access", async () => {
      jest.spyOn(Operation, "update").mockRejectedValue(new Error("Update role access failure"));

      const payload = {
        access: false,
        roleId: 2,
        operation: {
          operation: "ALL_OPS_PARTNERS",
          object: "partners",
          accessToAllOps: true,
          description: "полный доступ ко всем операциям с данными контрагентов",
          objectName: "представители\nинтернатов",
          operationName: "полный доступ ко всем операциям",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 299, roleId: 2, access: true, disabled: false }
          ]
        }
      };

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка (роль не обновлена).");
    });
  });

  describe("GET /get-roles-names-list", () => {
    it("should return names and ids of roles", async () => {
      const roles = [
        { id: 1, name: "admin" },
        { id: 2, name: "user" }
      ];
      jest.spyOn(Role, "findAll").mockResolvedValue(roles);

      const res = await request(app).get("/get-roles-names-list");

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Data retrieved.");
      expect(res.body.data).toEqual(roles);
    });

    it("should handle errors when fetching roles names list", async () => {
      jest.spyOn(Role, "findAll").mockRejectedValue(new Error("Fetch roles names failure"));

      const res = await request(app).get("/get-roles-names-list");

      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка при получении списка названий ролей.");
    });
  });

  describe("GET /get-roles", () => {
    it("should return detailed roles and operations", async () => {
      const roles = [
        { id: 1, name: "admin", description: "Administrator" },
        { id: 2, name: "user", description: "Regular user" }
      ];
      const roleOps = [
        { id: 101, roleId: 1, name: "OP_READ", access: true, disabled: false },
        { id: 102, roleId: 2, name: "OP_WRITE", access: false, disabled: false }
      ];
      jest.spyOn(Role, "findAll").mockResolvedValue(roles);
      jest.spyOn(Operation, "findAll").mockResolvedValue(roleOps);

      const res = await request(app).get("/get-roles");

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Data retrieved.");
      expect(res.body.data.roles).toEqual(roles);
      expect(res.body.data.operations).toBeDefined();
    });

    it("should handle errors when retrieving roles information", async () => {
      jest.spyOn(Role, "findAll").mockRejectedValue(new Error("Fetch roles failure"));

      const res = await request(app).get("/get-roles");

      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка при получении списка ролей.");
    });
  });

  describe("GET /check-role-before-delete/:id", () => {
    it("should return a comma separated list of users associated with that role", async () => {
      const users = [{ userName: "alice" }, { userName: "bob" }];
      jest.spyOn(User, "findAll").mockResolvedValue(users);

      const res = await request(app).get("/check-role-before-delete/1");

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Role deletion possibility checked.");
      expect(res.body.data).toBe("alice, bob");
    });

    it("should handle errors for role delete check", async () => {
      jest.spyOn(User, "findAll").mockRejectedValue(new Error("Check possibility to delete role failure"));

      const res = await request(app).get("/check-role-before-delete/1");

      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка при проверке возможности удаления роли.");
    });
  });

  describe("DELETE /delete-role/:id", () => {
    it("should delete the role and return success", async () => {
      jest.spyOn(Role, "destroy").mockResolvedValue(1);

      const res = await request(app).delete("/delete-role/1");

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Role deleted.");
      expect(res.body.data).toBe(true);
    });

    it("should return 404 if role is not found", async () => {
      jest.spyOn(Role, "destroy").mockResolvedValue(0);

      const res = await request(app).delete("/delete-role/999");

      expect(res.statusCode).toBe(404);
      expect(res.text).toBe("Роль не найдена.");
    });

    it("should handle errors when deleting a role", async () => {
      jest.spyOn(Role, "destroy").mockRejectedValue(new Error("Delete role failure"));

      const res = await request(app).delete("/delete-role/1");

      expect(res.statusCode).toBe(500);
      expect(res.text).toBe("Произошла ошибка при удалении роли.");
    });
  });

});
