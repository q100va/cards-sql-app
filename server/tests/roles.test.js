/* roles.test.js */
import request from "supertest";
import express from "express";
import router from "../routes/roles.js";
// Import the models so that we can later override/mock their methods.
import Role from "../models/role.js";
import Operation from "../models/operation.js";
import User from "../models/user.js";
import { OPERATIONS } from "../shared/operations.js";
import CustomError from "../shared/customError.js";
// Create an instance of express and mount the router under test.
const app = express();
app.use(express.json());
app.use("/", router);
// Mock the sanitization middleware to simply pass the request body
jest.mock("../middlewares/sanitize-body.js", () => {
  return (schema) => (req, res, next) => {
    // Assume that request body is already sanitized for testing purposes.
    next();
  };
});
describe("Role Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("POST /check-role-name", () => {
    it("should return data: true when duplicate role exists", async () => {
      // simulate a duplicate found
      Role.findOne = jest.fn().mockResolvedValue({ name: "admin" });
      const res = await request(app)
        .post("/check-role-name")
        .send({ roleName: "ADMIN" });
      expect(Role.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { name: expect.any(Object) },
      }));
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe(true);
      expect(res.body.msg).toBeDefined();
    });
    it("should return data: false when no duplicate is found", async () => {
      // simulate no duplicate found
      Role.findOne = jest.fn().mockResolvedValue(null);
      const res = await request(app)
        .post("/check-role-name")
        .send({ roleName: "newrole" });
      expect(Role.findOne).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe(false);
    });
    it("should handle errors when Role.findOne throws", async () => {
      Role.findOne = jest.fn().mockRejectedValue(new Error("DB error"));
      const res = await request(app)
        .post("/check-role-name")
        .send({ roleName: "errorrole" });
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка при проверке названия роли");
    });
    it("should fail if roleName is missing (sanitization error)", async () => {
      const res = await request(app)
        .post("/check-role-name")
        .send({ });
      // As we rely on our sanitization middleware, you might want to have another middleware to catch the missing field.
      // For the purposes of this test, the code itself might try to call toLowerCase on undefined
      // and result in a TypeError.
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка при проверке названия роли");
    });
  });
  describe("POST /create-role", () => {
    it("should successfully create a new role and associated operations", async () => {
      // simulate Role.create returns a role object with an id
      Role.create = jest.fn().mockResolvedValue({ id: 1, name: "Manager" });
      // Simulate Operation.create for each operation from OPERATIONS
      Operation.create = jest.fn().mockImplementation((data) => Promise.resolve(data));

      const res = await request(app)
        .post("/create-role")
        .send({ name: "Manager", description: "Role for Managers" });

      expect(Role.create).toHaveBeenCalledWith({
        name: "Manager",
        description: "Role for Managers",
      });
      // Ensure that Operation.create is called as many times as there are OPERATIONS.
      expect(Operation.create).toHaveBeenCalledTimes(OPERATIONS.length);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe("Manager");
    });
    it("should handle error if Role.create fails", async () => {
      Role.create = jest.fn().mockRejectedValue(new Error("DB error"));
      const res = await request(app)
        .post("/create-role")
        .send({ name: "ErrorRole", description: "Describe error role" });
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка. Роль не создана.");
    });
  });
  describe("PATCH /update-role", () => {
    it("should update an existing role", async () => {
      // simulate Role.update returns updated role object
      Role.update = jest.fn().mockResolvedValue([
        1,
        [{ id: 1, name: "UpdatedRole", description: "Updated description" }]
      ]);
      const res = await request(app)
        .patch("/update-role")
        .send({ id: 1, name: "UpdatedRole", description: "Updated description" });
      expect(Role.update).toHaveBeenCalledWith(
        { name: "UpdatedRole", description: "Updated description" },
        { where: { id: 1 }, returning: true }
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe("UpdatedRole");
    });
    it("should throw a not found error when role does not exist", async () => {
      // simulate not found when update returns no updated role
      Role.update = jest.fn().mockResolvedValue([0, []]);
      const res = await request(app)
        .patch("/update-role")
        .send({ id: 999, name: "NonExistent", description: "Does not exist" });
      expect(res.statusCode).toBe(404);
      expect(res.text).toContain("Обновление невозможно. Роль не найдена.");
    });
    it("should handle errors thrown during update", async () => {
      Role.update = jest.fn().mockRejectedValue(new Error("DB error"));
      const res = await request(app)
        .patch("/update-role")
        .send({ id: 1, name: "Name", description: "Desc" });
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка. Роль не обновлена.");
    });
  });
  describe("PATCH /update-role-access", () => {
    // In this test suite, we will spy on the helper function changeRoleOperation indirectly by checking
    // that Operation.update is called the expected number of times.
    it("should update the main operation and possibly dependent operations for full access", async () => {
      // Setup: simulate Operation.update for main operation and its complementary update.
      Operation.update = jest.fn()
        // first call: main operation update
        .mockResolvedValueOnce([1, [{ id: 10, roleId: 1, access: true, disabled: false }]])
        // second call: complementary operation update
        .mockResolvedValueOnce([1, [{ id: 11, roleId: 1, access: true, disabled: false }]]);

      // Also simulate that for the check, findOne returns null indicating all related operations are enabled.
      Operation.findOne = jest.fn().mockResolvedValue(null);
      // Pick one dummy operation from OPERATIONS that has flag property (simulate flag FULL or LIMITED)
      const dummyOperation = {
        fullAccess: true,
        object: "TestObject",
        operation: "VIEW_FULL_TestObject",
        flag: "FULL"
      };
      const reqBody = {
        access: true,
        roleId: 1,
        operation: dummyOperation
      };
      const res = await request(app)
        .patch("/update-role-access")
        .send(reqBody);
      // Depending on the logic, changeRoleOperation should be called on first and complementary operation.
      expect(Operation.update).toHaveBeenCalledTimes(2);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.object).toBe("TestObject");
    });
    it("should handle errors during role access update", async () => {
      Operation.update = jest.fn().mockRejectedValue(new Error("DB error"));
      const dummyOperation = {
        fullAccess: true,
        object: "TestObject",
        operation: "VIEW_FULL_TestObject",
        flag: "FULL"
      };
      const reqBody = {
        access: false,
        roleId: 1,
        operation: dummyOperation
      };
      const res = await request(app)
        .patch("/update-role-access")
        .send(reqBody);
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка (роль не обновлена).");
    });
  });
  describe("GET /get-roles-names-list", () => {
    it("should return a sorted list of roles with id and name", async () => {
      const rolesMock = [
        { id: 1, name: "Admin" },
        { id: 2, name: "User" }
      ];
      Role.findAll = jest.fn().mockResolvedValue(rolesMock);
      const res = await request(app).get("/get-roles-names-list");
      expect(Role.findAll).toHaveBeenCalledWith({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
        raw: true,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(rolesMock);
    });
    it("should handle errors when retrieving roles names list", async () => {
      Role.findAll = jest.fn().mockRejectedValue(new Error("DB error"));
      const res = await request(app).get("/get-roles-names-list");
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка при получении списка названий ролей.");
    });
  });
  describe("GET /get-roles", () => {
    it("should return detailed roles and their operations", async () => {
      const rolesMock = [
        { id: 1, name: "Admin", description: "Administrator" },
        { id: 2, name: "User", description: "Regular User" }
      ];
      const operationsMock = [
        { id: 10, roleId: 1, name: OPERATIONS[0].operation, access: true, disabled: false },
        { id: 20, roleId: 2, name: OPERATIONS[0].operation, access: false, disabled: false }
      ];
      Role.findAll = jest.fn().mockResolvedValue(rolesMock);
      Operation.findAll = jest.fn().mockResolvedValue(operationsMock);
      const res = await request(app).get("/get-roles");
      expect(Role.findAll).toHaveBeenCalled();
      expect(Operation.findAll).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.data.roles).toEqual(rolesMock);
      // Also check that the operations list inside data includes rolesAccesses array.
      expect(res.body.data.operations[0].rolesAccesses).toBeInstanceOf(Array);
    });
    it("should handle errors when retrieving roles details", async () => {
      Role.findAll = jest.fn().mockRejectedValue(new Error("DB error"));
      const res = await request(app).get("/get-roles");
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Произошла ошибка при получении списка ролей.");
    });
  });
  describe("GET /check-role-before-delete/:id", () => {
    it("should return a list of connected users if found", async () => {
      const usersMock = [
        { userName: "john_doe" },
        { userName: "jane_doe" }
      ];
      User.findAll = jest.fn().mockResolvedValue(usersMock);
      const res = await request(app).get("/check-role-before-delete/1");
      expect(User.findAll).toHaveBeenCalledWith({
        where: { roleId: "1" },
        attributes: ["userName"],
        raw: true,
      });
      expect(res.statusCode).toBe(200);
      // The usernames are joined with a comma.
      expect(res.body.data).toBe("john_doe, jane_doe");
    });
    it("should return data null if no connected users", async () => {
      User.findAll = jest.fn().mockResolvedValue([]);
      const res = await request(app).get("/check-role-before-delete/1");
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeNull();
    });
    it("should throw error if id param is missing or invalid", async () => {
      const res = await request(app).get("/check-role-before-delete/");
      // Express will give a 404 if route parameter is missing.
      expect(res.statusCode).toBe(404);
    });
  });
  describe("DELETE /delete-role/:id", () => {
    it("should delete a role successfully", async () => {
      Role.destroy = jest.fn().mockResolvedValue(1); // role deleted successfully
      const res = await request(app).delete("/delete-role/1");
      expect(Role.destroy).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.deleted).toBe(true);
    });
    it("should return error if role id is invalid", async () => {
      const res = await request(app).delete("/delete-role/invalid");
      expect(res.statusCode).toBe(400);
      expect(res.text).toContain("Некорректное значение id.");
    });
    it("should return error if no role is found", async () => {
      Role.destroy = jest.fn().mockResolvedValue(0);
      const res = await request(app).delete("/delete-role/999");
      expect(res.statusCode).toBe(404);
      expect(res.text).toContain("Роль не найдена.");
    });
  });
});
