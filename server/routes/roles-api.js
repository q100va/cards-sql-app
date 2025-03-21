import { Router } from "express";
import checkAuth from "../middleware/check-auth.js";

import Sequelize from 'sequelize';
import Role from "../models/role.js";
import User from "../models/user.js";
import { operations } from "../shared/operations.js";
//mport { objects } from "../shared/operations.js";
import Operation from "../models/operation.js";
const Op = Sequelize.Op;

const router = Router();


// API create role

router.post("/check-role-name", async (req, res) => {
  try {
    let roleName = req.body.data.toLowerCase();
    const duplicate = await Role.findOne({
      where: { name: { [Op.iLike]: roleName } },
      attributes: ['name'],
      raw: true
    });
    res.status(200).send({ msg: "Проверка завершена.", data: duplicate });
  } catch (e) {
    console.log("error");
    console.log(e);
    let message = `Произошла ошибка:  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

router.post("/create-role", async (req, res) => {
  try {
    const role = await Role.create(
      {
        name: req.body.data.name,
        description: req.body.data.description,
      }
    );
    console.log("role");
    console.log(role.id);
    //console.log(role.dataValues.id);

    for (let operation of operations) {
      let op = await Operation.create(
        {
          name: operation.operation,
          roleId: role.id,
          access: false,
          disabled: operation.flag == 'FULL',
        }
      );
      console.log("op");
      console.log(op);
    }
    res.status(200).send({ msg: "Роль успешно создана.", data: req.body.data.name });
  } catch (e) {
    console.log("error");
    console.log(e);
    console.log(e.statusCode);
    let message = `Произошла ошибка (роль не создана):  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

router.patch("/update-role", async (req, res) => {
  try {
    const role = req.body.data.role;

    await Role.update(
      {
        name: role.name.trim(),
        description: role.description.trim(),
      },
      {
        where: {
          id: role.id
        }
      }
    );
    res.status(200).send({ msg: "Роль успешно обновлена.", data: true });
  } catch (e) {
    console.log("error");
    console.log(e);
    console.log(e.statusCode);
    let message = `Произошла ошибка (роль не обновлена):  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

router.patch("/update-role-access", async (req, res) => {
  try {
    const access = req.body.data.access;
    const roleId = req.body.data.roleId;
    const operation = req.body.data.operation;
    await changeRoleOperation(roleId, operation, access);

    const listOfOperations = JSON.parse(JSON.stringify(operations));
    //const index = listOfOperations.findIndex(item => item.operation == operation);
    /*    console.log("operation");
       console.log(operation);
       console.log("index");
       console.log(index); */

    const filteredListOfOperations = listOfOperations.filter(item => item.object == operation.object && !item.fullAccess);
    if (operation.fullAccess) {
      for (let operation of filteredListOfOperations) {
        await changeRoleOperation(roleId, operation, access);
      }
    } else {
      const fullAccessOperation = listOfOperations.filter(item => item.object == operation.object && item.fullAccess)[0];
      if (!access) {
        console.log("listOfOperations");
        console.log(listOfOperations.length);
        await changeRoleOperation(roleId, fullAccessOperation, access);
      } else {

        //   filteredListOfOperations.length ==
        let fullAccess = true;
        for (let operation of filteredListOfOperations) {
          if (await Operation.findOne(
            {
              attributes: ['id'],
              where: {
                name: operation.operation,
                roleId: roleId,
                access: false
              },
              raw: true
            }
          )) {
            fullAccess = false;
            break;
          }
        }
        if (fullAccess) await changeRoleOperation(roleId, fullAccessOperation, true);
      }

    }

    res.status(200).send({ msg: "Роль успешно обновлена.", data: true });
  } catch (e) {
    console.log("error");
    console.log(e);
    console.log(e.statusCode);
    let message = `Произошла ошибка (роль не обновлена):  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});


async function changeRoleOperation(roleId, operation, access) {
  await Operation.update(
    { access: access },
    {
      where: {
        roleId: roleId, name: operation.operation
      }
    }
  );

  if (operation.flag == 'LIMITED' && access) {
    await Operation.update(
      { disabled: false },
      {
        where: {
          roleId: roleId, name: operation.operation.replace('VIEW_LIMITED', 'VIEW_FULL')
        }
      }
    );
  }
  if (operation.flag == 'LIMITED' && !access) {
    await Operation.update(
      { disabled: true },
      {
        where: {
          roleId: roleId, name: operation.operation.replace('VIEW_LIMITED', 'VIEW_FULL')
        }
      }
    );
  }
  if (operation.flag == 'FULL' && access) {
    await Operation.update(
      { disabled: true },
      {
        where: {
          roleId: roleId, name: operation.operation.replace('VIEW_FULL', 'VIEW_LIMITED')
        }
      }
    );
  }
  if (operation.flag == 'FULL' && !access) {
    await Operation.update(
      { disabled: false },
      {
        where: {
          roleId: roleId, name: operation.operation.replace('VIEW_FULL', 'VIEW_LIMITED')
        }
      }
    );
  }






  /*   if (access) {
      const foundOperation = await Operation.findOne(
        {
          where: { roleId: roleId, name: operation }
        }
      );
      if (!foundOperation) {
        await Operation.create(
          {
            name: operation,
            roleId: roleId,
          }
        );
      }
    } else {
      Operation.destroy(
        {
          where: { roleId: roleId, name: operation }
        }
      );
    } */

}

//API get users
router.get("/get-roles-names-list", async (req, res) => {
  try {
    const roles = await Role.findAll(
      {
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
        raw: true,
      }
    );
    res.status(200).send({ msg: "Данные получены.", data: { roles: roles } });
  } catch (e) {
    console.log("error");
    console.log(e);
    console.log(e.statusCode);
    let message = `Произошла ошибка:  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

router.get("/get-roles", async (req, res) => {
  try {
    const roles = await Role.findAll(
      {
        attributes: ['id', 'name', 'description'],
        order: [['id', 'ASC']],
        raw: true,

        /*         include: [
                  {
                    model: Operation,
                    attributes: ['name', 'access', 'disabled'],
                  },
                ] */
      }
    );
    /*     console.log("roles");
        console.log(roles);


     */

    /*     let listsOfRolesWithFullAccess = [];
        let listOfObjectsWithFullAccess = []; */
    // let listOfRoles = [];

    let listOfOperations = JSON.parse(JSON.stringify(operations));
    for (let role of roles) {

      /*     listOfRoles.push(
              {
                id: role.id,
                name: role.name,
                description: role.description
              }
            ); */
      //  if (!role.operations) { role.operations = []; }
      for (let operation of listOfOperations) {
        /*         console.log("operation");
                console.log(operation);
                console.log("role.operations");
                console.log(role.operations); */
        //const i = role.operations.findIndex(item => item.name == operation.operation);
        /*      console.log("access");
             console.log(access); */
        const roleOperation = await Operation.findOne(
          {
            attributes: ['access', 'disabled'],
            where: {
              name: operation.operation,
              roleId: role.id,
            },
            raw: true
          }
        );
     /*    console.log("roleOperation");
        console.log(roleOperation); */
        operation.roles.push(
          {
            id: role.id,
            //name: role.name,
            access: roleOperation.access,
            disabled: roleOperation.disabled,
          }
        );
      }
    }

    /*     for (let operation of operations) {
          if (listOfObjectsWithFullAccess.includes(operation.object) && !operation.fullAccess) {
            for (let role of operation.roles) {
              if (listsOfRolesWithFullAccess.includes(role.name)) {
                role.disabled = true;
              }
            }
          }
        } */

    /*    const filteredOperations = operations.filter(item => item.fullAccess);
       let listOfRoles;
       for (let operation of filteredOperations) {
         operation.object;
         listOfRoles = operation.roles.filter()

       }
    */

    /*     roles: [
          {
            role: "admin",
            roleName: "Администратор",
            access: true,
            disabled: false
          },
          {
            role: "manager",
            roleName: "Менеджер",
            access: true,
            disabled: false
          },
          {
            role: "coordinator",
            roleName: "Координатор",
            access: true,
            disabled: false
          },
          {
            role: "user",
            roleName: "Пользователь",
            access: true,
            disabled: false
          },
        ], */

    res.status(200).send({ msg: "Данные получены.", data: { operations: listOfOperations, roles: roles } });
  } catch (e) {
    console.log("error");
    console.log(e);
    console.log(e.statusCode);
    let message = `Произошла ошибка:  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

//API delete role

router.get("/check-role-before-delete/:id", async (req, res) => {
  try {
    const roleId = req.params.id;
    const connectedUsers = await User.findAll({
      where: {
        roleId: roleId
      },
      attributes: ['id'],
      raw: true
    });
    let possibility = false;
    if (connectedUsers.length == 0) {
      possibility = true;
    }
    res.status(200).send({ msg: "Роль может быть удалена.", data: possibility });
  } catch (e) {
    console.log("error");
    console.log(e);
    let message = `Произошла ошибка:  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

router.delete("/delete-role/:id", async (req, res) => {
  try {
    let roleId = req.params.id;
    await Role.destroy({
      where: { id: roleId }
    });
    res.status(200).send({ msg: "Роль удалена.", data: true });
  } catch (e) {
    console.log("error");
    console.log(e);
    let message = `Произошла ошибка:  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

export default router;
