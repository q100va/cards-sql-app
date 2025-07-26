import { Router } from "express";
import pkg from 'bcryptjs';
const { hashSync } = pkg;
import Country from "../models/country.js";
import Region from "../models/region.js";
import District from "../models/district.js";
import Locality from "../models/locality.js";

import User from "../models/user.js";
import UserContact from "../models/user-contact.js";
import UserAddress from "../models/user-address.js";
import Sequelize from 'sequelize';
import Role from "../models/role.js";
import SearchUser from "../models/search-user.js";
const Op = Sequelize.Op;

const router = Router();
const saltRounds = 10;

// API create user

router.post("/check-username", async (req, res) => {
  try {
    const userName = req.body.data.userName.toLowerCase();
    const id = req.body.data.id;

    const whereParams = id ? {
      userName: { [Op.iLike]: userName },
      id: { [Op.ne]: id },
    } : {
      userName: { [Op.iLike]: userName },
    };

    const duplicate = await User.findOne({
      where: whereParams,
      attributes: ['userName'],
      raw: true
    });
    res.status(200).send({ msg: "Проверка завершена.", data: duplicate });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/check-user-data", async (req, res) => {
  try {
    let user = req.body.data;
    const whereParams = user.id ?
      {
        firstName: { [Op.iLike]: user.firstName.toLowerCase() },
        lastName: { [Op.iLike]: user.lastName.toLowerCase() },
        id: { [Op.ne]: user.id },
      } : {
        firstName: { [Op.iLike]: user.firstName.toLowerCase() },
        lastName: { [Op.iLike]: user.lastName.toLowerCase() }
      }

    let duplicatesName = await User.findAll({
      where: whereParams,
      attributes: ['userName'],
      raw: true
    });
    duplicatesName = duplicatesName.map(item => item.userName);
    let duplicatesContact = [];


    for (let key in user.contacts) {
      for (let contact of user.contacts[key]) {
        if (contact) {
          let params = {
            attributes: ['userName'],
            include: {
              model: UserContact,
              where: {
                type: key, content: contact
              },
              attributes: [],
            },
            raw: true
          };
          if (user.id) {
            params.where = {
              id: { [Op.ne]: user.id },
            };
          }
          let existedContacts = await User.findAll(params);
          if (existedContacts.length > 0) {
            existedContacts = existedContacts.map(item => item.userName);
            duplicatesContact.push(
              {
                type: key,
                content: contact,
                users: existedContacts
              }
            );
          }
        }
      }
    }
    console.log("duplicatesName, duplicatesContact");
    console.log(duplicatesName, duplicatesContact);

    res.status(200).send({ msg: "Проверка завершена.", data: { duplicatesName: duplicatesName, duplicatesContact: duplicatesContact } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});


router.post("/create-user", async (req, res) => {
  let newContact, newAddress, createdUser, newSearchString;
  try {
    let creatingUser = req.body.data;
    console.log("creatingUser");
    console.log(creatingUser);
    const hashedPassword = hashSync(creatingUser.password, saltRounds);
    createdUser = await User.create(
      {
        userName: creatingUser.userName,
        password: hashedPassword,
        firstName: creatingUser.firstName,
        patronymic: creatingUser.patronymic,
        lastName: creatingUser.lastName,
        roleId: creatingUser.roleId,
        comment: creatingUser.comment,
        isRestricted: creatingUser.isRestricted,
        causeOfRestriction: creatingUser.causeOfRestriction,
        dateOfRestriction: creatingUser.dateOfRestriction
      }
    );
    console.log("createdUser");
    console.log(createdUser);
    console.log(createdUser.dataValues.dateOfStart);

    const role = await Role.findOne({
      where: {
        id: creatingUser.roleId,
      }
    });

    let searchString =
      creatingUser.userName +
      ' ' + role.name +
      ' ' + creatingUser.firstName +
      (creatingUser.patronymic ? (' ' + creatingUser.patronymic) : '') +
      ' ' + creatingUser.lastName +
      (creatingUser.comment ? (' ' + creatingUser.comment) : '') +
      (creatingUser.isRestricted ? ' заблокирован с' : ' активен') +
      (creatingUser.dateOfRestriction ? (' ' + cloneDate(creatingUser.dateOfRestriction)) : '') +
      (creatingUser.causeOfRestriction ? (' ' + creatingUser.causeOfRestriction) : '') +
      ' ' + cloneDate(createdUser.dataValues.dateOfStart);

    for (let key in creatingUser.orderedContacts) {
      for (let contact of creatingUser.orderedContacts[key]) {
        if (contact) {
          newContact = await UserContact.create({ type: key, content: contact });
          await newContact.setUser(createdUser);
          searchString = searchString + ' ' + contact;
        }
      }
    }

    /*     let country = creatingUser.addresses.country;
        let region = creatingUser.addresses.region;
        let district = creatingUser.addresses.district;
        let locality = creatingUser.addresses.locality; */
    for (let address of creatingUser.addresses) {
      /*       if (address.country) {
              console.log("address.country");
              console.log(address.country);

              country = await Country.findOne({
                where: { id: address.country },
                attributes: ['id'],
                raw: true
              });
              console.log("countryId");
              console.log(country.id);
            }
            if (address.region) {
              region = await Region.findOne({
                where: { id: address.region },
                attributes: ['id'],
                raw: true
              });
            }
            if (address.district) {
              district = await District.findOne({
                where: { id: address.district },
                attributes: ['id'],
                raw: true
              });
            }
            if (address.locality) {
              locality = await Locality.findOne({
                where: { id: address.locality },
                attributes: ['id'],
                raw: true
              });
            } */
      if (address.country || address.region || address.district || address.locality) {
        newAddress
          = await UserAddress.create({
            countryId: address.country,
            regionId: address.region,
            districtId: address.district,
            localityId: address.locality
          });
        await newAddress.setUser(createdUser);
        let countryName, regionName, districtName, localityName = '';
        if (address.country) {
          countryName = await Country.findOne({ where: { id: address.country }, attributes: ['name'] });
          countryName = countryName.name ? countryName.name + ' ' : '';
        }
        if (address.region) {
          regionName = await Region.findOne({ where: { id: address.region }, attributes: ['name'] });
          regionName = regionName.name ? regionName.name + ' ' : '';
        }
        if (address.district) {
          districtName = await District.findOne({ where: { id: address.district }, attributes: ['name'] });
          districtName = districtName.name ? districtName.name + ' ' : '';
        }
        if (address.locality) {
          localityName = await Locality.findOne({ where: { id: address.locality }, attributes: ['name'] });
          localityName = localityName.name ? localityName.name + ' ' : '';
        }
        searchString =
          searchString + countryName + regionName + districtName + localityName;
      }
    }
    newSearchString = await SearchUser.create({ content: searchString.trim() });
    console.log("newSearchString");
    console.log(newSearchString);
    await newSearchString.setUser(createdUser);
    // await createdUser.setRole(role);
    res.status(200).send({ msg: "Аккаунт успешно создан.", data: creatingUser.userName });
  } catch (e) {
    if (createdUser) {
      /*       await UserAddress.destroy({
              where: {
                userId: createdUser.id,
              },
            });
            await UserContact.destroy({
              where: {
                userId: createdUser.id,
              },
            }); */
      await User.destroy({
        where: {
          id: createdUser.id,
        },
      });
    }
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

// API get users

/* allFilterParameters: {
  viewOption: string;
  notOnlyActual: boolean;
  searchValue: string;
  sortParameters: {
    active: string;
    direction: 'asc' | 'desc' | '';
  };
  filter: { [key: string]: string[] | Date[] | null };
},
pageSize: number,
currentPage: number */

router.post("/get-users", async (req, res) => {

  console.log('req.body');
  console.log(req.body);
  const viewOption = req.body.allFilterParameters.viewOption;
  const notOnlyActual = req.body.allFilterParameters.notOnlyActual;
  const searchValue = req.body.allFilterParameters.searchValue.trim();
  const exactMatch = req.body.allFilterParameters.exactMatch;
  const sortParameters = req.body.allFilterParameters.sortParameters;
  const roles = req.body.allFilterParameters.filter.roles;
  const comment = req.body.allFilterParameters.filter.comment;
  const contactTypes = req.body.allFilterParameters.filter.contactTypes;
  const addresses = req.body.allFilterParameters.addressFilter;
  /* const countries = req.body.allFilterParameters.filter.countries;
  const regions = req.body.allFilterParameters.filter.regions;
  const districts = req.body.allFilterParameters.filter.districts;
  const localities = req.body.allFilterParameters.filter.localities; */
  const dateBeginningRange = req.body.allFilterParameters.filter.dateBeginningRange;
  const dateRestrictionRange = req.body.allFilterParameters.filter.dateRestrictionRange;
  const pageSize = req.body.pageSize;
  const currentPage = req.body.currentPage;
  const strongAddressFilter = req.body.allFilterParameters.strongAddressFilter;
  const strongContactFilter = req.body.allFilterParameters.strongContactFilter;

  /*     filter = ({
        roles: null,
        comment: null,
        contactTypes: null,
        countries: null,
        regions: null,
        districts: null,
        localities: null,
        dateBeginningRange: null,
      }); */


  try {
    //form order: {active: [userName, isRestricted, dateOsStart, comment, roles], direction: [desc, asc]}
    let orderParams = [];
    let orderByName;
    let orderDirection;
    let orderModel;

    if (sortParameters.direction == '') {// || (sortParameters.active == '' && sortParameters.direction == '')
      orderByName = 'userName';
      orderDirection = 'ASC';
    } else {
      orderDirection = sortParameters.direction.toUpperCase();
      if (sortParameters.active == 'role') {
        orderByName = 'name';
        orderModel = { model: Role, as: 'role' };
      } else {
        orderByName = sortParameters.active;
      }
    }

    if (orderModel) orderParams.push(orderModel);
    orderParams.push(orderByName);
    orderParams.push(orderDirection);

    console.log("orderParams");
    console.log(orderParams);

    //form where
    let whereParams = {};

    //viewOption
    switch (viewOption) {
      case "all":
        break;
      case "only-active":
        whereParams.isRestricted = false;
        break;
      case "only-blocked":
        whereParams.isRestricted = true;
        break;
    }

    //comment: comment: (2) ['с комментарием', 'без комментария']
    if (comment && comment.length == 1) {
      whereParams.comment = comment[0] == 'без комментария' ? null : { [Op.not]: null };
    }

    //dateOfStart - dateBeginningRange: dateBeginningRange:(2) [Mon Feb 03 2025 00:00:00 GMT-0500 (Eastern Standard Time), Mon Feb 10 2025 00:00:00 GMT-0500 (Eastern Standard Time)]
    if (dateBeginningRange && dateBeginningRange.length == 2) {
      whereParams.dateOfStart = {
        [Op.lt]: new Date(new Date(dateBeginningRange[1]).getTime() + (24 * 60 * 60 * 1000)),
        [Op.gt]: new Date(dateBeginningRange[0])
      }
    }

    //dateOfRestriction
    if (dateRestrictionRange && dateRestrictionRange.length == 2) {
      whereParams.dateOfRestriction = {
        [Op.lt]: new Date(new Date(dateRestrictionRange[1]).getTime() + (24 * 60 * 60 * 1000)),
        [Op.gt]: new Date(dateRestrictionRange[0])
      }
    }

    //roles
    if (roles && roles.length > 0) {
      whereParams.roleId = { [Op.in]: roles };
    }


    let contactWhereParams = {};
    let addressWhereParams = {};
    let searchUserWhereParams = {};
    let contactRequiredParam = false;
    let addressRequiredParam = false;
    let searchUserRequiredParam = false;
    let innerRestriction = '';
    if (!notOnlyActual) {
      contactWhereParams.isRestricted = false;
      addressWhereParams.isRestricted = false;
      searchUserWhereParams.isRestricted = false;
      innerRestriction = '"isRestricted" = false AND';
    }

    //contactTypes: contactTypes:(10) ['email', 'phoneNumber', 'telegramId', 'telegramPhoneNumber', 'telegramNickname', 'whatsApp', 'vKontakte', 'instagram', 'facebook', 'otherContact']
    if (contactTypes && contactTypes.length > 0) {
      let listOfTypes = `(`;
      for (let item of contactTypes) {
        listOfTypes = listOfTypes + `'` + item.type + `', `;
      }
      listOfTypes = listOfTypes.slice(0, -2) + `)`;
      console.log('strongContactFilter');
      console.log(strongContactFilter);

      if (!strongContactFilter) {
        contactWhereParams.userId = {
          [Op.in]: Sequelize.literal(
            `(SELECT DISTINCT "userId" FROM "user-contacts"
            WHERE ${innerRestriction} type IN ${listOfTypes})`)
        }
      } else {
        contactWhereParams.userId = {
          [Op.in]: Sequelize.literal(
            `(SELECT DISTINCT "userId" FROM "user-contacts"
          WHERE ${innerRestriction} type IN ${listOfTypes}
          GROUP BY "userId"
          HAVING COUNT(DISTINCT type)=${contactTypes.length})`
          )
        }
      }
      contactRequiredParam = true;
    }

    if (addresses.countries && addresses.countries.length > 0) {
      addressRequiredParam = true;

      const findParent = async (id, Toponym, parentIdName, parentType) => {
        const toponym = await Toponym.findOne({
          where: { id: id },
          attributes: [parentIdName],
        });
        console.log('toponym');
        console.log(toponym);

        console.log('addresses', parentType);
        console.log(addresses[parentType]);
        addresses[parentType] = addresses[parentType].filter(
          (i) => i !== toponym[parentIdName]
        );
        console.log('addresses', parentType);
        console.log(addresses[parentType]);


        return toponym[parentIdName];
      }

      const buildIdsList = async (type, Toponym, parentIdName, parentType) => {
        console.log('type', type);
        let listOfDistrictsIds = ``;
        listOfDistrictsIds = `(`;
        let parentId;
        for (let id of addresses[type]) {
          parentId = await findParent(id, Toponym, parentIdName, parentType);
          console.log('parentId', parentId);
          if (type == 'localities') parentId = await findParent(parentId, District, 'regionId', 'regions');
          console.log('parentId', parentId);
          if (type == 'localities' || type == 'districts') parentId = await findParent(parentId, Region, 'countryId', 'countries');
          console.log('parentId', parentId);
          listOfDistrictsIds = listOfDistrictsIds + `'` + id + `', `;
        }
        listOfDistrictsIds = listOfDistrictsIds.slice(0, -2) + `)`;
        console.log('listOfDistrictsIds', listOfDistrictsIds);
        console.log(`(${addresses[type].map((id) => `'${id}'`).join(', ')})`);

        return `(${addresses[type].map((id) => `'${id}'`).join(', ')})`
      };

      const localitiesAmount = addresses.localities?.length || 0;
      const listOfLocalitiesIds = localitiesAmount > 0 ? await buildIdsList('localities', Locality, 'districtId', 'districts') : '';

      const districtsAmount = addresses.districts?.length || 0;
      const listOfDistrictsIds = districtsAmount > 0 ? await buildIdsList('districts', District, 'regionId', 'regions') : '';

      const regionsAmount = addresses.regions?.length || 0;
      const listOfRegionsIds = regionsAmount > 0 ? await buildIdsList('regions', Region, 'countryId', 'countries') : '';

      const countriesAmount = addresses.countries.length;
      const listOfCountriesIds = countriesAmount > 0
        ? `(${addresses.countries.map((id) => `'${id}'`).join(', ')})`
        : '';


      if (addressRequiredParam) {
        let whereString = `
          ${listOfCountriesIds ? '"countryId" IN' + listOfCountriesIds : ''}
          ${listOfCountriesIds && (listOfRegionsIds || listOfDistrictsIds || listOfLocalitiesIds) ? ' OR ' : ''}
          ${listOfRegionsIds ? '"regionId" IN' + listOfRegionsIds : ''}
          ${listOfRegionsIds && (listOfDistrictsIds || listOfLocalitiesIds) ? ' OR ' : ''}
          ${listOfDistrictsIds ? '"districtId" IN' + listOfDistrictsIds : ''}
          ${listOfDistrictsIds && listOfLocalitiesIds ? ' OR ' : ''}
          ${listOfLocalitiesIds ? '"localityId" IN' + listOfLocalitiesIds : ''}
         `;
        if (!strongAddressFilter) {
          addressWhereParams.userId = {
            [Op.in]: Sequelize.literal(
              `(SELECT DISTINCT "userId" FROM "user-addresses"
              WHERE ${innerRestriction} (${whereString}))`
            )
          }
        } else { //TODO: is not tested!!!
          addressWhereParams.userId = {
            [Op.in]: Sequelize.literal(
              `(SELECT DISTINCT "userId" FROM "user-addresses"
              WHERE ${innerRestriction} (${whereString})
              GROUP BY "userId"
              HAVING COUNT(DISTINCT "countryId")=${countriesAmount}
              ${regionsAmount ? ' AND COUNT(DISTINCT "regionId")=' + regionsAmount : ''}
              ${districtsAmount ? ' AND COUNT(DISTINCT "districtId")=' + districtsAmount : ''}
              ${localitiesAmount ? ' AND COUNT(DISTINCT "localityId")=' + localitiesAmount : ''}
              )`
            )
          }
        }
      }
    }

    let parameters =
      [{
        model: Role,
        attributes: ['name'],
      },
      {
        model: UserContact,
        as: 'contacts',
        where: contactWhereParams,
        required: contactRequiredParam,
        attributes: ['type', 'content'],
      },
      {
        model: UserAddress,
        as: 'addresses',
        where: addressWhereParams,
        required: addressRequiredParam,
        attributes: ['id'],

        include: [
          {
            model: Country,
            attributes: ['id', 'name'],
          },
          {
            model: Region,
            attributes: ['id', 'shortName'],
          },
          {
            model: District,
            attributes: ['id', 'shortName'],
          },
          {
            model: Locality,
            attributes: ['id', 'shortName'],
          },
        ]
      },
      ];

    //searchValue
    if (searchValue) {
      let arrayOfSearchValues = searchValue.split(" ");
      let searchString = '';
      let conjunction = exactMatch ? ' AND ' : ' OR ';
      for (let i = 0; i < arrayOfSearchValues.length; i++) {
        searchString =
          searchString + `content ILIKE '%` + arrayOfSearchValues[i] + `%'` + ((i != arrayOfSearchValues.length - 1) ? conjunction : ``);
      }

      searchUserWhereParams.userId = {
        [Op.in]: Sequelize.literal(
          `(SELECT DISTINCT "userId" FROM "search-users" WHERE ${innerRestriction} ${searchString})`)
      }

      searchUserRequiredParam = true;
      parameters.push({
        model: SearchUser,
        where: searchUserWhereParams,
        required: searchUserRequiredParam,
        attributes: [],
      }
      )
    }


    const length = await User.count({
      where: whereParams,
      include: parameters,
      distinct: true
    });

    console.log("length");
    console.log(length);

    const users = await User.findAll({
      offset: pageSize * (currentPage - 1),
      limit: pageSize,
      order: [orderParams],
      attributes: { exclude: ['password'] },
      where: whereParams,
      include: parameters
    });
    console.log("users");
    console.log(users);
    res.status(200).send({ msg: "Данные получены.", data: { users: users, length: length } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.get("/check-user-before-delete/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    //TODO: find does this user has clients and orders

    res.status(200).send({ msg: "Пользователь может быть удален.", data: true });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.delete("/delete-user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await User.destroy({
      where: { id: userId }
    });
    res.status(200).send({ msg: "Пользователь удален.", data: true });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.patch("/block-user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await User.update(
      {
        isRestricted: true,
        causeOfRestriction: req.body.data,
        dateOfRestriction: new Date()
      },
      {
        where: { id: userId }
      },
    );
    res.status(200).send({ msg: "Пользователь заблокирован.", data: true });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.patch("/unblock-user", async (req, res) => {
  try {
    let userId = req.body.data;
    await User.update(
      {
        isRestricted: false,
        causeOfRestriction: null,
        dateOfRestriction: null
      },
      {
        where: { id: userId }
      },
    );
    res.status(200).send({ msg: "Пользователь разблокирован.", data: true });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

function cloneDate(date) {
  //date = new Date(date);

  return String(date.getDate()).padStart(2, '0') +
    '.' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '.' +
    date.getFullYear();
}

function errorHandling(e) {
  console.log("error");
  console.log(e);
  let message = `Произошла ошибка:  ${e.message}`;
  if (e.parent?.detail) {
    message = message + ': ' + e.parent.detail;
  }
  const statusCode = e.statusCode ? e.statusCode : 500;
  return { statusCode: statusCode, message: message };
}




export default router;



