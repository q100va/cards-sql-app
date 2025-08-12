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
import CustomError from "../shared/customError.js";
import OutdatedName from "../models/outdated-name.js";
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

    /*     const role = await Role.findOne({
          where: {
            id: creatingUser.roleId,
          }
        });
     */
    /*     let searchString =
          creatingUser.userName +
          ' ' + role.name +
          ' ' + creatingUser.firstName +
          (creatingUser.patronymic ? (' ' + creatingUser.patronymic) : '') +
          ' ' + creatingUser.lastName +
          (creatingUser.comment ? (' ' + creatingUser.comment) : '') +
          (creatingUser.isRestricted ? ' заблокирован с' : ' активен') +
          (creatingUser.dateOfRestriction ? (' ' + cloneDate(creatingUser.dateOfRestriction)) : '') +
          (creatingUser.causeOfRestriction ? (' ' + creatingUser.causeOfRestriction) : '') +
          ' ' + cloneDate(createdUser.dataValues.dateOfStart); */
    //TODO: error if contacts empty
    for (let key in creatingUser.draftContacts) {
      for (let contact of creatingUser.draftContacts[key]) {
        if (contact) {
          newContact = await UserContact.create({ type: key, content: contact });
          await newContact.setUser(createdUser);
          // searchString = searchString + ' ' + contact;
        }
      }
    }
    const address = creatingUser.draftAddress;
    if (address.countryId || address.regionId || address.districtId || address.localityId) {
      newAddress
        = await UserAddress.create({
          countryId: address.countryId,
          regionId: address.regionId,
          districtId: address.districtId,
          localityId: address.localityId
        });
      await newAddress.setUser(createdUser);
      /*       let countryName, regionName, districtName, localityName = '';
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
              searchString + countryName + regionName + districtName + localityName; */
    }
    //   }

    const createdUser = await User.findOne({
      where: { id },
      include: [
        {
          model: UserContact,
          as: 'contacts',
          attributes: ['id', 'type', 'content', 'isRestricted'],
        },
        {
          model: UserAddress,
          as: 'addresses',
          attributes: ['id', 'isRestricted'],
          include: [
            { model: Country, attributes: ['id', 'name'] },
            { model: Region, attributes: ['id', 'shortName'] },
            { model: District, attributes: ['id', 'shortName'] },
            { model: Locality, attributes: ['id', 'shortName'] },
          ]
        },
        {
          model: Role,
          attributes: ['name'],
        },
        {
          model: OutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName']
        },
      ],
    });
    const searchString = await createSearchString(createdUser);
    newSearchString = await SearchUser.create({ content: searchString });
    console.log("newSearchString");
    console.log(newSearchString);
    await newSearchString.setUser(createdUser);
    // await createdUser.setRole(role);
    res.status(200).send({ msg: "Аккаунт успешно создан.", data: transformUserData(createdUser.toJSON()) });
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

router.post("/update-user", async (req, res) => {

  try {
    console.log("req.body.data");
    console.log(req.body.data);
    const id = req.body.data.id;
    const { changes, restoringData, outdatingData, deletingData } = req.body.data.updatedUserData;
    let newContact, newAddress, newSearchString;

    //changes
    if (changes.main) {
      Object.keys(changes.main).forEach(key => changes.main[key] === null && delete changes.main[key]);

      console.log("changes.main");
      console.log(changes.main);
      await User.update(
        changes.main,
        {
          where: {
            id: id
          }
        });
    }

    const updatingUser = await User.findOne({
      where: id
    });

    if (changes.address) {
      if (changes.address.countryId || changes.address.regionId || changes.address.districtId || changes.address.localityId) {
        newAddress
          = await UserAddress.create({
            countryId: changes.address.countryId,
            regionId: changes.address.regionId,
            districtId: changes.address.districtId,
            localityId: changes.address.localityId
          });
        await newAddress.setUser(updatingUser);
      }
    }
    if (changes.contacts) {
      for (let key in changes.contacts) {
        for (let contact of changes.contacts[key]) {
          if (contact) {
            newContact = await UserContact.create({ type: key, content: contact });
            await newContact.setUser(updatingUser);
          }
        }
      }
    }

    //restoringData

    if (restoringData.addresses && restoringData.addresses.length > 0) {
      for (let addressId of restoringData.addresses) {
        await UserAddress.update({
          isRestricted: false
        },
          { where: { id: addressId } }
        );
      }
    }

    if (restoringData.names && restoringData.names.length > 0) {
      for (let nameId of restoringData.names) {
        await OutdatedName.destroy({ where: { id: nameId } });
      }
    }

    if (restoringData.userNames && restoringData.userNames.length > 0) {
      for (let userNameId of restoringData.userNames) {
      await OutdatedName.destroy({ where: { id: userNameId} });
    }
  }

    if (restoringData.contacts) {
      for (let key in restoringData.contacts) {
        for (let contact of restoringData.contacts[key]) {
          await UserContact.update({
            isRestricted: false
          },
            { where: { id: contact.id } }
          );
        }
      }
    }

    // outdatingData

    if (outdatingData.names) {
        await OutdatedName.create({
          userId: id,
          firstName: outdatingData.names.firstName,
          patronymic: outdatingData.names.patronymic,
          lastName: outdatingData.names.lastName
        });
    }

      if (outdatingData.userName) {
        await OutdatedName.create({
          userId: id,
          userName: outdatingData.userName,
        });
      }


    if (outdatingData.address) {
      await UserAddress.update({
        isRestricted: true
      },
        { where: { id: outdatingData.address } }
      );
    }

    if (outdatingData.contacts) {
      await UserContact.update({
        isRestricted: true
      },
        { where: { id: { [Op.in]: outdatingData.contacts } } }
      );

    }

    //deletingData

    if (deletingData.address) {
      await UserAddress.destroy({
        where: { id: { [Op.in]: deletingData.address } }
      });
    }

    if (deletingData.contacts) {
      await UserContact.destroy({
        where: { id: { [Op.in]: deletingData.contacts } }
      });
    }

    const updatedUser = await User.findOne({
      where: { id },
      include: [
        {
          model: UserContact,
          as: 'contacts',
          attributes: ['id', 'type', 'content', 'isRestricted'],
        },
        {
          model: UserAddress,
          as: 'addresses',
          attributes: ['id', 'isRestricted'],
          include: [
            { model: Country, attributes: ['id', 'name'] },
            { model: Region, attributes: ['id', 'shortName'] },
            { model: District, attributes: ['id', 'shortName'] },
            { model: Locality, attributes: ['id', 'shortName'] },
          ]
        },
        {
          model: Role,
          attributes: ['name'],
        },
        {
          model: OutdatedName,
          as: 'outdatedNames',
          attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName']
        },
      ],
    });

    await SearchUser.update({
      isRestricted: true
    },
      { where: { userId: updatedUser.id, isRestricted: false } }
    );

    const searchString = await createSearchString(updatedUser);

    newSearchString = await SearchUser.create({ content: searchString });
    console.log("newSearchString");
    console.log(newSearchString);
    await newSearchString.setUser(updatedUser);
    // await createdUser.setRole(role);
    res.status(200).send({ msg: "Аккаунт успешно обновлен.", data: transformUserData(updatedUser.toJSON()) });
  } catch (e) {
    /*  if (updatedUser) {
           await UserAddress.destroy({
              where: {
                userId: createdUser.id,
              },
            });
            await UserContact.destroy({
              where: {
                userId: createdUser.id,
              },
            });
      await User.destroy({
        where: {
          id: updatedUser.id,
        },
      });
    }*/
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});


async function createSearchString(updatedUser) {
  const role = await Role.findOne({
    where: {
      id: updatedUser.roleId,
    }
  });
  let searchString = '';

  // Add main user data
  searchString = updatedUser.userName +
    ' ' + role.name +
    ' ' + updatedUser.firstName +
    (updatedUser.patronymic ? (' ' + updatedUser.patronymic) : '') +
    ' ' + updatedUser.lastName +
    (updatedUser.comment ? (' ' + updatedUser.comment) : '') +
    (updatedUser.isRestricted ? ' заблокирован с' : ' активен') +
    (updatedUser.dateOfRestriction ? (' ' + cloneDate(updatedUser.dateOfRestriction)) : '') +
    (updatedUser.causeOfRestriction ? (' ' + updatedUser.causeOfRestriction) : '') +
    ' ' + cloneDate(updatedUser.dateOfStart);
  // Add contacts that are not restricted
  const contacts = updatedUser.contacts.filter(contact => !contact.isRestricted);
  for (const contact of contacts) {
    searchString += ' ' + contact.content;
  }
  // Add address if exists and not restricted
  const address = updatedUser.addresses.find(addr => !addr.isRestricted);
  if (address) {
    searchString += (address.country ? ' ' + address.country.name : '') +
      (address.region ? ' ' + address.region.shortName : '') +
      (address.district ? ' ' + address.district.shortName : '') +
      (address.locality ? ' ' + address.locality.shortName : '');
  }
  return searchString.trim();
}
//TODO: test
router.post("/change-password", async (req, res) => {
  try {
    const { userId, value } = req.body.data;
    const hashedPassword = hashSync(value, saltRounds);
    await User.update(
      { password: hashedPassword },
      { where: { id: userId } }
    );
    res.status(200).send({
      msg: "Пароль успешно изменен.",
      data: true
    });
  } catch (e) {
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

  //console.log('req.body');
  //console.log(req.body);
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
    //form order: {active: [userName, isRestricted, dateOsStart, comment, role], direction: [desc, asc]}
    let orderParams = [];

    if (sortParameters.direction === '') {
      orderParams = [['userName', 'ASC']];
    } else {
      const direction = sortParameters.direction.toUpperCase();
      if (sortParameters.active === 'role') {
        orderParams = [
          [
            Sequelize.literal(`(SELECT "name" FROM "roles" WHERE "roles"."id" = "user"."roleId")`),
            direction
          ]
        ];
      } else {
        orderParams = [[sortParameters.active, direction]];
      }
    }


    /*     let orderByName;
        let orderDirection;
        let orderModel;

        if (sortParameters.direction == '') {
          orderParams = ['userName', 'ASC'];
        } else if (sortParameters.active === 'role') {
          orderParams = [{ model: Role }, 'name', sortParameters.direction.toUpperCase()];
        } else {
          orderParams = [sortParameters.active, sortParameters.direction.toUpperCase()];
        } */

    /*     if (sortParameters.direction == '') {// || (sortParameters.active == '' && sortParameters.direction == '')
          orderByName = 'userName';
          orderDirection = 'ASC';
        } else {
          orderDirection = sortParameters.direction.toUpperCase();
          if (sortParameters.active == 'role') {
            orderByName = 'name';
            orderModel = { model: Role };
          } else {
            orderByName = sortParameters.active;
          }
        }

        if (orderModel) orderParams.push(orderModel);
        orderParams.push(orderByName);
        orderParams.push(orderDirection);
     */
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
    if (roles.length > 0) {
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
    if (contactTypes.length > 0) {
      let listOfTypes = `(`;
      for (let item of contactTypes) {
        listOfTypes = listOfTypes + `'` + item.type + `', `;
      }
      listOfTypes = listOfTypes.slice(0, -2) + `)`;
      //console.log('strongContactFilter');
      // console.log(strongContactFilter);

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

    if (addresses.countries.length > 0) {
      addressRequiredParam = true;

      const findParent = async (id, Toponym, parentIdName, parentType) => {
        const toponym = await Toponym.findOne({
          where: { id: id },
          attributes: [parentIdName],
        });
        //console.log('toponym');
        //console.log(toponym);

        //console.log('addresses', parentType);
        //console.log(addresses[parentType]);
        addresses[parentType] = addresses[parentType].filter(
          (i) => i != toponym[parentIdName]
        );
        //console.log('addresses', parentType);
        //console.log(addresses[parentType]);


        return toponym[parentIdName];
      }

      const buildIdsList = async (type, Toponym, parentIdName, parentType) => {
        //console.log('type', type);
        let listOfDistrictsIds = ``;
        listOfDistrictsIds = `(`;
        let parentId;
        for (let id of addresses[type]) {
          parentId = await findParent(id, Toponym, parentIdName, parentType);
          //console.log('parentId', parentId);
          if (type == 'localities') parentId = await findParent(parentId, District, 'regionId', 'regions');
          //console.log('parentId', parentId);
          if (type == 'localities' || type == 'districts') parentId = await findParent(parentId, Region, 'countryId', 'countries');
          //console.log('parentId', parentId);
          listOfDistrictsIds = listOfDistrictsIds + `'` + id + `', `;
        }
        listOfDistrictsIds = listOfDistrictsIds.slice(0, -2) + `)`;
        //console.log('listOfDistrictsIds', listOfDistrictsIds);
        //console.log(`(${addresses[type].map((id) => `'${id}'`).join(', ')})`);

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
    { model: Role }

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
        attributes: ['id', 'type', 'content', 'isRestricted'],
        // separate: true,
      },
      {
        model: UserAddress,
        as: 'addresses',
        where: addressWhereParams,
        required: addressRequiredParam,
        attributes: ['id', 'isRestricted'],
        // separate: true,

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
      {
        model: OutdatedName, as: 'outdatedNames',
        attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName'],
        separate: true
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

    // console.log("length");
    // console.log(length);

    const users = await User.findAll({
      offset: pageSize * (currentPage - 1),
      limit: pageSize,
      order: [orderParams],
      attributes: { exclude: ['password'] },
      where: whereParams,
      include: parameters,
      /*     subQuery: false,
          distinct: true, */
    });
    /*    console.log("users");
        console.log(users[0]); */
    let transformedUsers = [];

    for (let user of users) {

      transformedUsers.push(transformUserData(user.toJSON()));
    }
    //console.log('transformed user data:', transformedUsers);

    res.status(200).send({ msg: "Данные получены.", data: { users: transformedUsers, length: length } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.get("/get-user-by-id/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: UserContact,
          as: 'contacts',
          attributes: ['id', 'type', 'content', 'isRestricted'],
        },
        {
          model: UserAddress,
          as: 'addresses',
          attributes: ['id', 'isRestricted'],
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
        {
          model: Role,
          attributes: ['name'],
        },
        {
          model: OutdatedName, as: 'outdatedNames',
          attributes: ['id', 'userName', 'firstName', 'patronymic', 'lastName']
        },
      ],
    });
    if (!user) {
      throw new CustomError(`Пользователь с id ${userId}! не найден!`, 404);
    }
    res.status(200).send({ msg: "Пользователь найден.", data: transformUserData(user.toJSON()) });
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

//TODO: transform user and users!!!
function transformUserData(rawUserData) {
  const user = { ...rawUserData };
  let orderedContacts = {};
  let outdatedData = { contacts: {}, addresses: [], names: [], userNames: [] };
  let outdatedDataContacts = {};

  // console.log(user.role.id, 'user.role.id');
  user.roleName = user.role.name;
  delete user.role;

  if (user.contacts) {
    for (let contact of user.contacts) {
      const isTelegram =
        contact.type === 'telegramNickname' ||
        contact.type === 'telegramPhoneNumber' ||
        contact.type === 'telegramId';

      if (!contact.isRestricted) {

        if (isTelegram) {
          orderedContacts['telegram'] = orderedContacts['telegram'] || [];
          orderedContacts['telegram'].push({ id: contact.id, content: contact.content });
        }

        orderedContacts[contact.type] = orderedContacts[contact.type] || [];
        orderedContacts[contact.type].push({ id: contact.id, content: contact.content });
      } else {
        outdatedDataContacts[contact.type] = outdatedDataContacts[contact.type] || [];
        outdatedDataContacts[contact.type].push({ id: contact.id, content: contact.content });
      }
    }
  }
  outdatedData.contacts =
    outdatedDataContacts;
  user.orderedContacts = orderedContacts;
  delete user.contacts;

  if (user.addresses?.length > 0) {
    let outdatedDataAddresses = [];
    for (let address of user.addresses) {
      if (address.isRestricted) {
        outdatedDataAddresses.push({
          country: address.country,
          region: address.region,
          district: address.district,
          locality: address.locality,
          id: address.id,
        });
      }
      const filteredAddresses = user.addresses.filter(
        (address) => !address.isRestricted
      );

      user.address =
        filteredAddresses.length > 0
          ? filteredAddresses[0]
          :
          {
            country: null,
            region: null,
            district: null,
            locality: null,
          };

      outdatedData.addresses =
        outdatedDataAddresses;
    }

  } else {
    user.address =
    {
      country: null,
      region: null,
      district: null,
      locality: null,
    };
  }

  if (user.address.country) {
    delete user.address.isRestricted;
  }

  delete user.addresses;

  if (user.outdatedNames?.length > 0) {
    outdatedData.names = user.outdatedNames
      .filter(name => name.firstName !== null)
      .map(name => ({
        firstName: name.firstName,
        patronymic: name.patronymic,
        lastName: name.lastName,
        id: name.id,
      }));
    outdatedData.userNames = user.outdatedNames
      .filter(name => name.userName !== null)
      .map(name => ({
        userName: name.userName,
        id: name.id,
      }));

    delete user.outdatedNames;
  }

  user.outdatedData = outdatedData;

  // console.log('transformed user data:', user.orderedContacts.email);

  return user;
}




export default router;



