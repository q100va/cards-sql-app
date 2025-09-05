import request from "supertest";
import { jest } from "@jest/globals";

// Sequelize + operators
import Sequelize from "sequelize";
const { Op } = Sequelize;

// Use a fixed transaction object across tests
const fakeTx = { id: "test-transaction" };

// Mock transaction wrapper before loading the router
jest.unstable_mockModule("../../controllers/with-transaction.js", () => ({
  withTransaction: async (fn) => fn(fakeTx),
}));

// Load router and models after mocks
const { default: router } = await import("../../routes/roles-api.js");
import Operation from "../../models/operation.js";
import Role from "../../models/role.js";
import User from "../../models/user.js";
import { OPERATIONS } from "../../shared/operations.js";
import { makeTestApp } from "./makeApp.js";

// Minimal app
const app = makeTestApp(router, '/');

describe("Role Routes", () => {
  // Reset spies/stubs between tests
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // Close ORM connections (prevents open handle warnings)
  afterAll(async () => {
    await Role.sequelize.close();
    await Operation.sequelize.close();
    await User.sequelize.close();
  });

  // ── GET /check-role-name/:name ────────────────────────────────────────────────
  describe("GET /check-role-name/:name", () => {
    it("queries case-insensitively and returns true when role exists", async () => {
      const findSpy = jest.spyOn(Role, "findOne").mockResolvedValue({ name: "admin" });

      const res = await request(app).get("/check-role-name/AdMiN");

      // Assert query shape
      expect(findSpy).toHaveBeenCalledWith({
        where: { name: expect.objectContaining({ [Op.iLike]: "admin" }) },
        attributes: ["name"],
        raw: true,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.code).toBe("ROLE.ALREADY_EXISTS");
      expect(res.body.data).toBe(true);
    });

    it("returns false when role does not exist", async () => {
      const findSpy = jest.spyOn(Role, "findOne").mockResolvedValue(null);
      const res = await request(app).get("/check-role-name/unknown");

      // Assert query shape
      expect(findSpy).toHaveBeenCalledWith({
        where: { name: expect.objectContaining({ [Op.iLike]: "unknown" }) },
        attributes: ["name"],
        raw: true,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe(false);
    });

    it("handles internal errors", async () => {
      jest.spyOn(Role, "findOne").mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/check-role-name/error");

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NAME_NOT_CHECKED'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("returns 422 when params fail schema validation", async () => {
      // use an obviously invalid (e.g., too short or disallowed) param to trigger zod
      const res = await request(app).get("/check-role-name/%00");

      expect(res.status).toBe(422);
      expect('correlationId' in res.body).toBe(true);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.VALIDATION'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });


  // ── POST /create-role ─────────────────────────────────────────────────────────
  describe("POST /create-role", () => {
    it("creates a role and seeds all operations (transaction-used)", async () => {
      const roleData = { name: "manager", description: "Manages stuff" };

      const createSpy = jest.spyOn(Role, "create").mockResolvedValue({
        id: 42,
        name: roleData.name,
        description: roleData.description,
      });

      const bulkMock = jest
        .spyOn(Operation, "bulkCreate")
        .mockImplementation((rows, _opts) =>
          Promise.resolve(rows.map((r, i) => ({ ...r, id: 1000 + i })))
        );

      const res = await request(app).post("/create-role").send(roleData);

      // Response
      expect(res.statusCode).toBe(200);
      expect(res.body.code).toBe('ROLE.CREATED');
      expect(res.body.data).toBe("manager");

      // Role.create called with tx
      expect(createSpy).toHaveBeenCalledTimes(1);
      const [createArgs, createOpts] = createSpy.mock.calls[0];
      expect(createArgs).toEqual(roleData);
      expect(createOpts?.transaction).toBe(fakeTx);

      // bulkCreate called with tx and correct rows
      expect(bulkMock).toHaveBeenCalledTimes(1);
      const [rowsArg, optsArg] = bulkMock.mock.calls[0];
      expect(optsArg?.transaction).toBe(fakeTx);

      expect(Array.isArray(rowsArg)).toBe(true);
      expect(rowsArg.length).toBe(OPERATIONS.length);
      rowsArg.forEach((r) =>
        expect(r).toEqual(
          expect.objectContaining({
            name: expect.any(String),
            roleId: 42,
            access: false,
            disabled: expect.any(Boolean),
          })
        )
      );

      // Representative flag rules
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

      // Names match config
      expect(rowsArg.map((r) => r.name).sort()).toEqual(
        OPERATIONS.map((o) => o.operation).sort()
      );
      expect(rowsArg.every((r) => r.access === false)).toBe(true);
    });

    it("returns 500 if creation fails", async () => {
      jest.spyOn(Role, "create").mockRejectedValue(new Error("Create role failure"));

      const res = await request(app)
        .post("/create-role")
        .send({ name: "failure", description: "This will fail" });

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_CREATED'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("returns 422 when body fails schema validation", async () => {
      const res = await request(app).post("/create-role").send({});

      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.VALIDATION'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });

  // ── PATCH /update-role ────────────────────────────────────────────────────────
  describe("PATCH /update-role", () => {
    it("updates name/description for an existing role", async () => {
      const payload = { id: 1, name: "newName", description: "newDescription" };
      const updateSpy = jest.spyOn(Role, "update").mockResolvedValue([1, [payload]]);

      const res = await request(app).patch("/update-role").send(payload);

      expect(updateSpy).toHaveBeenCalledWith(
        { name: "newName", description: "newDescription" },
        {
          where: { id: 1 },
          individualHooks: true,
          returning: ['id', 'name', 'description'],
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.code).toBe('ROLE.UPDATED');
      expect(res.body.data).toEqual(payload);
    });

    it("returns 404 when role not found", async () => {
      jest.spyOn(Role, "update").mockResolvedValue([0, [null]]);

      const res = await request(app)
        .patch("/update-role")
        .send({ id: 999, name: "nonexistent", description: "none" });

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_FOUND'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("handles internal errors", async () => {
      jest.spyOn(Role, "update").mockRejectedValue(new Error("Update role failure"));

      const res = await request(app)
        .patch("/update-role")
        .send({ id: 999, name: "newName", description: "newDescription" });

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_UPDATED'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("returns 422 when body fails schema validation", async () => {
      // Missing id/name/description → zod should fail
      const res = await request(app).patch("/update-role").send({});

      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.VALIDATION'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });

  // ── PATCH /update-role-access ────────────────────────────────────────────────
  describe("PATCH /update-role-access", () => {

    it("turning OFF VIEW_FULL → sets FULL.access=false, LIMITED.disabled=false, ALL_OPS.access=false", async () => {
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
            { id: 200, roleId: 2, access: true, disabled: false },
          ],
        },
      };

      const updateSpy = jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        // We return minimal echo; assertions only check call args
        return Promise.resolve([1, [{ id: 999, roleId: payload.roleId, access: !!values?.access, disabled: !!values?.disabled }]]);
      });

      const findOneSpy = jest.spyOn(Operation, "findOne").mockResolvedValue(null);

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.statusCode).toBe(200);

      // 1) FULL → { access:false }
      expect(updateSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ access: false }),
        expect.objectContaining({
          where: { roleId: 2, name: "VIEW_FULL_PARTNERS_LIST" },
        })
      );

      // 2) LIMITED → { disabled:false }
      expect(updateSpy).toHaveBeenNthCalledWith(
        2,
        { disabled: false },
        expect.objectContaining({
          where: { roleId: 2, name: "VIEW_LIMITED_PARTNERS_LIST" },
        })
      );

      // 3) ALL_OPS → { access:false }
      expect(updateSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ access: false }),
        expect.objectContaining({
          where: { roleId: 2, name: "ALL_OPS_PARTNERS" },
        })
      );
      expect(findOneSpy).not.toHaveBeenCalled();
    });


    it("turning ON VIEW_FULL (all peers ON) → enables ALL_OPS and sets LIMITED.disabled=true", async () => {
      const payload = {
        access: true,
        roleId: 2,
        operation: {
          operation: "VIEW_FULL_PARTNERS_LIST",
          object: "partners",
          accessToAllOps: false,
          flag: "FULL",
          description: "",
          objectName: "",
          operationName: "",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 200, roleId: 2, access: false, disabled: false },
          ],
        },
      };

      // Peers are already enabled → findOne returns null
      const findOneSpy = jest.spyOn(Operation, "findOne").mockResolvedValue(null);

      const updateSpy = jest.spyOn(Operation, "update").mockImplementation((values, options) => {
        // We return minimal echo; assertions only check call args
        return Promise.resolve([1, [{ id: 999, roleId: payload.roleId, access: !!values?.access, disabled: !!values?.disabled }]]);
      });

      const res = await request(app).patch("/update-role-access").send(payload);
      expect(res.statusCode).toBe(200);

      // 1) FULL → { access:true }
      expect(updateSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ access: true }),
        expect.objectContaining({ where: { roleId: 2, name: "VIEW_FULL_PARTNERS_LIST" } })
      );

      // 2) LIMITED → { disabled:true } (stays enabled but becomes read-only)
      expect(updateSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ disabled: true }),
        expect.objectContaining({ where: { roleId: 2, name: "VIEW_LIMITED_PARTNERS_LIST" } })
      );

      // 3) ALL_OPS → { access:true }
      expect(updateSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ access: true }),
        expect.objectContaining({ where: { roleId: 2, name: "ALL_OPS_PARTNERS" } })
      );

      expect(findOneSpy).toHaveBeenCalled(); // peers check happened
    });

    it("turning ON a single op while another peer OFF → ALL_OPS not updated", async () => {
      const payload = {
        access: true,
        roleId: 2,
        operation: {
          operation: "ADD_NEW_PARTNER",
          object: "partners",
          accessToAllOps: false,
          description: "",
          objectName: "",
          operationName: "",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 193, roleId: 2, access: false, disabled: false },
          ],
        },
      };

      // Simulate another related op still OFF → first call returns a row
      const findOneSpy = jest.spyOn(Operation, "findOne");
      findOneSpy.mockResolvedValueOnce({ id: 999 }).mockResolvedValue(null);

      const updateSpy = jest.spyOn(Operation, "update").mockResolvedValue([1, [{ id: 193, roleId: 2, access: true, disabled: false }]]);

      const res = await request(app).patch("/update-role-access").send(payload);
      expect(res.statusCode).toBe(200);

      // 1) Only the requested op is updated to access:true
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ access: true }),
        expect.objectContaining({ where: { roleId: 2, name: "ADD_NEW_PARTNER" } })
      );

      // 2) ALL_OPS must NOT be updated
      const allOpsCall = updateSpy.mock.calls.find(([, opts]) => opts?.where?.name === "ALL_OPS_PARTNERS");
      expect(allOpsCall).toBeUndefined();

      expect(findOneSpy).toHaveBeenCalled(); // peers check happened
    });

    it("turning ON ALL_OPS → enables all related ops; LIMITED.disabled=true", async () => {
      const payload = {
        access: true,
        roleId: 2,
        operation: {
          operation: "ALL_OPS_PARTNERS",
          object: "partners",
          accessToAllOps: true,
          description: "",
          objectName: "",
          operationName: "",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 299, roleId: 2, access: false, disabled: false },
          ],
        },
      };

      const updateSpy = jest.spyOn(Operation, "update").mockImplementation((values, options) =>
        Promise.resolve([1, [{ id: 900, roleId: payload.roleId, access: !!values?.access, disabled: !!values?.disabled }]])
      );

      const res = await request(app).patch("/update-role-access").send(payload);
      expect(res.statusCode).toBe(200);

      // 1) ALL_OPS → { access:true }
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ access: true }),
        expect.objectContaining({ where: { roleId: 2, name: "ALL_OPS_PARTNERS" } })
      );

      // 2) Regular op(s) → { access:true } (example: ADD_NEW_PARTNER)
      expect(updateSpy.mock.calls.some(
        ([vals, opts]) => opts?.where?.name === "ADD_NEW_PARTNER" && vals?.access === true
      )).toBe(true);

      // 3) VIEW_FULL → { access:true, disabled:false }
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ access: true }),
        expect.objectContaining({ where: { roleId: 2, name: "VIEW_FULL_PARTNERS_LIST" } })
      );

      // 4) VIEW_LIMITED → { disabled:true } (stays enabled but read-only)
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true }),
        expect.objectContaining({ where: { roleId: 2, name: "VIEW_LIMITED_PARTNERS_LIST" } })
      );

      // Optional sanity: no updates setting access:false for this scenario
      const noFalse = updateSpy.mock.calls.every(([vals]) => vals?.access !== false);
      expect(noFalse).toBe(true);
    });

    it("turning OFF ALL_OPS → sets all related ops access=false; FULL.disabled=true (if present)", async () => {
      const payload = {
        access: false,
        roleId: 2,
        operation: {
          operation: "ALL_OPS_PARTNERS",
          object: "partners",
          accessToAllOps: true,
          description: "",
          objectName: "",
          operationName: "",
          rolesAccesses: [
            { id: 42, roleId: 1, access: true, disabled: false },
            { id: 299, roleId: 2, access: true, disabled: false },
          ],
        },
      };

      const updateSpy = jest
        .spyOn(Operation, "update")
        .mockImplementation((values, options) =>
          Promise.resolve([1, [{ id: 1, roleId: payload.roleId, access: !!values?.access, disabled: !!values?.disabled }]])
        );

      const res = await request(app).patch("/update-role-access").send(payload);
      expect(res.statusCode).toBe(200);

      // Derive names from OPERATIONS to avoid hardcoding.
      const object = payload.operation.object;
      const fullOp = OPERATIONS.find(o => o.object === object && o.flag === "FULL");
      const limitedOp = OPERATIONS.find(o => o.object === object && o.flag === "LIMITED");
      const allOpsName = payload.operation.operation;

      // 1) ALL_OPS → access:false
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ access: false }),
        expect.objectContaining({ where: { roleId: 2, name: allOpsName } })
      );

      // 2) Every update for this object (except maybe LIMITED/FULL specifics) should set access:false.
      const callsForObject = updateSpy.mock.calls.filter(
        ([, opts]) => typeof opts?.where?.name === "string" && opts.where.roleId === 2
      );

      // Ensure there is no call that sets access:true
      const anyTrue = callsForObject.some(([vals]) => vals?.access === true);
      expect(anyTrue).toBe(false);

      // 3) If FULL op exists in config — disabled:true (access:false).
      if (fullOp) {
        const fullDisabledCall = callsForObject.find(
          ([vals, opts]) =>
            opts?.where?.name === fullOp.operation && vals?.disabled === true
        );
        expect(fullDisabledCall).toBeTruthy();
        if (fullDisabledCall) {
          const [vals] = fullDisabledCall;
          if ('access' in vals) {
            expect(vals.access).toBe(false);
          }
        }
      }

      // 4) If LIMITED op exists in config  — access:false (disabled:false).
      if (limitedOp) {
        const limitedAccessOff = callsForObject.find(
          ([vals, opts]) =>
            opts?.where?.name === limitedOp.operation && vals?.access === false
        );
        expect(limitedAccessOff).toBeTruthy();
      }

    });

    it("handles internal errors", async () => {
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
            { id: 299, roleId: 2, access: true, disabled: false },
          ],
        },
      };

      const res = await request(app).patch("/update-role-access").send(payload);

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_UPDATED'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("returns 422 when body fails schema validation", async () => {
      const res = await request(app).patch("/update-role-access").send({});
      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.VALIDATION'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });

  // ── GET /get-roles-names-list ────────────────────────────────────────────────
  describe("GET /get-roles-names-list", () => {
    it("selects only id/name ordered asc and returns the pairs", async () => {
      const roles = [
        { id: 1, name: "admin" },
        { id: 2, name: "user" },
      ];
      const findAllSpy = jest.spyOn(Role, "findAll").mockResolvedValue(roles);

      const res = await request(app).get("/get-roles-names-list");

      // Assert query shape
      expect(findAllSpy).toHaveBeenCalledWith({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
        raw: true,
      });

      // Assert response shape
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(roles);
    });

    it("handles internal errors", async () => {
      jest.spyOn(Role, "findAll").mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/get-roles-names-list");

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NAME_LIST_FAILED'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });


  // ── GET /get-roles ───────────────────────────────────────────────────────────
  describe("GET /get-roles", () => {
    it("returns roles with operations; operations are merged per role by id", async () => {
      const roles = [
        { id: 1, name: "admin", description: "Administrator" },
        { id: 2, name: "user", description: "Regular user" },
      ];
      const roleIds = roles.map(r => r.id);

      const findRolesSpy = jest.spyOn(Role, "findAll").mockResolvedValue(roles);

      // Pick two real operation names from config to avoid mismatches
      const [opA, opB] = OPERATIONS.slice(0, 2); // assumes at least 2 exist
      const roleOps = [
        { id: 101, roleId: 1, name: opA.operation, access: true, disabled: false },
        { id: 102, roleId: 2, name: opB.operation, access: false, disabled: true },
      ];
      const findOpsSpy = jest.spyOn(Operation, "findAll").mockResolvedValue(roleOps);

      const res = await request(app).get("/get-roles");

      // Assert Role.findAll query shape
      expect(findRolesSpy).toHaveBeenCalledWith({
        attributes: ["id", "name", "description"],
        order: [["id", "ASC"]],
        raw: true,
      });

      // Assert Operation.findAll query shape
      expect(findOpsSpy).toHaveBeenCalledWith({
        where: { roleId: roleIds },
        attributes: ["id", "roleId", "name", "access", "disabled"],
        raw: true,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.roles).toEqual(roles);

      // Check that operations array exists and contains our op names
      const ops = res.body.data.operations;
      expect(Array.isArray(ops)).toBe(true);

      // Find in response the opA/opB entries and ensure rolesAccesses contains our roleOps by id
      const entryA = ops.find((o) => o.operation === opA.operation);
      const entryB = ops.find((o) => o.operation === opB.operation);
      expect(entryA).toBeTruthy();
      expect(entryB).toBeTruthy();

      const raA = entryA.rolesAccesses.find((ra) => ra.id === 101);
      const raB = entryB.rolesAccesses.find((ra) => ra.id === 102);
      expect(raA).toEqual({ id: 101, roleId: 1, access: true, disabled: false });
      expect(raB).toEqual({ id: 102, roleId: 2, access: false, disabled: true });
    });

    it("handles internal errors", async () => {
      jest.spyOn(Role, "findAll").mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/get-roles");

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.LIST_FAILED'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });


  // ── GET /check-role-before-delete/:id ────────────────────────────────────────
  describe("GET /check-role-before-delete/:id", () => {
    it("returns comma-separated usernames for that role", async () => {
      const countSpy = jest.spyOn(User, "count").mockResolvedValue(2);

      const res = await request(app).get("/check-role-before-delete/1");

      // Assert query shape
      expect(countSpy).toHaveBeenCalledWith({
        where: { roleId: 1 },
        raw: true,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.code).toBe('ROLE.HAS_DEPENDENCIES');
      expect(res.body.data).toBe(2);
    });

    it("handles internal errors", async () => {
      jest.spyOn(User, "count").mockRejectedValue(new Error("DB down"));

      const res = await request(app).get("/check-role-before-delete/1");

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_CHECKED'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("returns 422 when params fail schema validation", async () => {
      const res = await request(app).get("/check-role-before-delete/not-a-number");
      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.VALIDATION'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });


  // ── DELETE /delete-role/:id ──────────────────────────────────────────────────
  describe("DELETE /delete-role/:id", () => {
    it("deletes an existing role", async () => {
      const destroySpy = jest.spyOn(Role, "destroy").mockResolvedValue(1);

      const res = await request(app).delete("/delete-role/1");

      expect(destroySpy).toHaveBeenCalledWith({
        where: { id: 1 },
        individualHooks: true,
        "transaction": {
          "id": "test-transaction",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.code).toBe('ROLE.DELETED');
      expect(res.body.data).toBe(null);
    });

    it("returns 404 when role is not found", async () => {
      jest.spyOn(Role, "destroy").mockResolvedValue(0);

      const res = await request(app).delete("/delete-role/999");

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_FOUND'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("handles internal errors", async () => {
      jest.spyOn(Role, "destroy").mockRejectedValue(new Error("DB down"));

      const res = await request(app).delete("/delete-role/1");

      expect(res.status).toBe(500);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.ROLE.NOT_DELETED'
      });
      expect('correlationId' in res.body).toBe(true);
    });

    it("returns 422 when params fail schema validation", async () => {
      const res = await request(app).delete("/delete-role/NaN");
      expect(res.status).toBe(422);
      expect(res.headers['content-type']).toMatch(/application\/json/i);
      expect(res.body).toMatchObject({
        code: 'ERRORS.VALIDATION'
      });
      expect('correlationId' in res.body).toBe(true);
    });
  });

});
