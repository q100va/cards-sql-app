import { Router } from "express";
import pkg from 'bcryptjs';
const { hashSync } = pkg;
import checkAuth from "../middleware/check-auth.js";
import Country from "../models/country.js";
import Region from "../models/region.js";
import District from "../models/district.js";
import Locality from "../models/locality.js";

import CustomError from "../shared/customError.js";
import User from "../models/user.js";
import Contact from "../models/contact.js";
import Address from "../models/address.js";
import Sequelize from 'sequelize';
import Role from "../models/role.js";
import SearchUser from "../models/search-user.js";
const Op = Sequelize.Op;

const router = Router();
const saltRounds = 10;

// API create user

router.post("/check-username", async (req, res) => {
  try {
    let userName = req.body.data.toLowerCase();
    const duplicate = await User.findOne({
      where: { userName: { [Op.iLike]: userName } },
      attributes: ['userName'],
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

router.post("/check-user-data", async (req, res) => {
  try {
    let newUser = req.body.data;
    let duplicatesName = await User.findAll({
      where: {
        firstName: { [Op.iLike]: newUser.firstName.toLowerCase() },
        lastName: { [Op.iLike]: newUser.lastName.toLowerCase() }
      },
      attributes: ['userName'],
      raw: true
    });
    duplicatesName = duplicatesName.map(item => item.userName);
    let duplicatesContact = [];
    for (let key in newUser.contacts) {
      for (let contact of newUser.contacts[key]) {
        if (contact) {
          let existedContacts = await User.findAll({
            attributes: ['userName'],
            include: {
              model: Contact,
              where: {
                type: key, content: contact, isRestricted: false
              },
              attributes: [],
            },
            raw: true
          });
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
          newContact = await Contact.create({ type: key, content: contact });
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
          = await Address.create({
            countryId: address.country,
            regionId: address.region,
            districtId: address.district,
            localityId: address.locality
          });
        await newAddress.setUser(createdUser);
        let countryName, regionName, districtName, localityName = '';
        if (address.country) {
          countryName = await Country.findOne({ where: { id: address.country }, attributes: ['name'] });
          countryName = countryName.name + ' ';
        }
        if (address.region) {
          regionName = await Region.findOne({ where: { id: address.region }, attributes: ['name'] });
          regionName = regionName.name + ' ';
        }
        if (address.district) {
          districtName = await District.findOne({ where: { id: address.district }, attributes: ['name'] });
          districtName = districtName.name + ' ';
        }
        if (address.country) {
          localityName = await Locality.findOne({ where: { id: address.locality }, attributes: ['name'] });
          localityName = localityName.name + ' ';
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
    console.log("error");
    console.log(e);
    console.log(e.statusCode);
    if (createdUser) {
      /*       await Address.destroy({
              where: {
                userId: createdUser.id,
              },
            });
            await Contact.destroy({
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
    let message = `Произошла ошибка (пользователь не сохранен):  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
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
            `(SELECT DISTINCT "userId" FROM contacts
            WHERE ${innerRestriction} type IN ${listOfTypes})`)
        }
      } else {
        contactWhereParams.userId = {
          [Op.in]: Sequelize.literal(
            `(SELECT DISTINCT "userId" FROM contacts
          WHERE ${innerRestriction} type IN ${listOfTypes}
          GROUP BY "userId"
          HAVING COUNT(DISTINCT type)=${contactTypes.length})`
          )
        }
      }
      contactRequiredParam = true;
    }


    /*     SELECT "userId"
    FROM contacts
    WHERE type IN('vKontakte','instagram' )
    group by "userId"
    having count(distinct type)=2 */

    /* addresses:
    {countries : [143],
    regions : [66],
    districts : [37, name: 'Лесной городской округ город', regionId: 66}],
    localities : [{id: 105, name: 'Лесной город', districtId: 37}]}
     */


    if (addresses.countries && addresses.countries.length > 0) {
      let countriesAmount, regionsAmount, districtsAmount, localitiesAmount = 0;
      addressRequiredParam = true;
      countriesAmount = addresses.countries.length;

      //localities
      let listOfLocalitiesIds = ``;
      if (addresses.localities && addresses.localities.length > 0) {
        localitiesAmount = addresses.localities.length;
        listOfLocalitiesIds = `(`;
        for (let id of addresses.localities) {

          const locality = await Locality.findOne({
            where: { id: id },
            attributes: ['districtId'],
          });
          addresses.districts = addresses.districts.filter(id => id != locality.districtId);

          const district = await District.findOne({
            where: { id: locality.districtId },
            attributes: ['regionId'],
          });
          addresses.regions = addresses.regions.filter(id => id != district.regionId);

          const region = await Region.findOne({
            where: { id: district.regionId },
            attributes: ['countryId'],
          });
          addresses.countries = addresses.countries.filter(id => id != region.countryId);

          listOfLocalitiesIds = listOfLocalitiesIds + `'` + id + `', `;
        }
        listOfLocalitiesIds = listOfLocalitiesIds.slice(0, -2) + `)`;
      }

      //districts
      let listOfDistrictsIds = ``;
      if (addresses.districts && addresses.districts.length > 0) {
        districtsAmount = addresses.districts.length;
        listOfDistrictsIds = `(`;

        for (let id of addresses.districts) {
          const district = await District.findOne({
            where: { id: id },
            attributes: ['regionId'],
          });
          addresses.regions = addresses.regions.filter(id => id != district.regionId);

          const region = await Region.findOne({
            where: { id: district.regionId },
            attributes: ['countryId'],
          });
          addresses.countries = addresses.countries.filter(id => id != region.countryId);

          listOfDistrictsIds = listOfDistrictsIds + `'` + id + `', `;
        }
        listOfDistrictsIds = listOfDistrictsIds.slice(0, -2) + `)`;
      }

      //regions
      let listOfRegionsIds = ``;
      if (addresses.regions && addresses.regions.length > 0) {
        regionsAmount = addresses.regions.length;
        listOfRegionsIds = `(`;
        for (let id of addresses.regions) {
          const region = await Region.findOne({
            where: { id: id },
            attributes: ['countryId'],
          })
          addresses.countries = addresses.countries.filter(id => id != region.countryId);

          listOfRegionsIds = listOfRegionsIds + `'` + id + `', `;
        }
        listOfRegionsIds = listOfRegionsIds.slice(0, -2) + `)`;
        console.log('listOfRegionsIds');
        console.log(listOfRegionsIds);
        console.log('addresses.countries');
        console.log(addresses.countries);
      }

      //countries
      let listOfCountriesIds = ``;
      if (addresses.countries && addresses.countries.length > 0) {
        listOfCountriesIds = `(`;
        for (let id of addresses.countries) {
          listOfCountriesIds = listOfCountriesIds + `'` + id + `', `;
        }
        listOfCountriesIds = listOfCountriesIds.slice(0, -2) + `)`;
      }

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
              `(SELECT DISTINCT "userId" FROM addresses
              WHERE ${innerRestriction} (${whereString}))`
            )
          }
        } else { //TODO: is not tested!!!
          addressWhereParams.userId = {
            [Op.in]: Sequelize.literal(
              `(SELECT DISTINCT "userId" FROM addresses
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
        model: Contact,
        where: contactWhereParams,
        required: contactRequiredParam,
        attributes: ['type', 'content'],
      },
      {
        model: Address,
        where: addressWhereParams,
        required: addressRequiredParam,
        attributes: ['id'],

        include: [
          {
            model: Country,
            attributes: ['name'],
          },
          {
            model: Region,
            attributes: ['shortName'],
          },
          {
            model: District,
            attributes: ['shortName'],
          },
          {
            model: Locality,
            attributes: ['shortName'],
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
    res.status(200).send({ msg: "Данные получены.", data: { users: users, length: length } });
  } catch (e) {
    let message = `Произошла ошибка:  ${e.message}`;
    if (e.parent?.detail) {
      message = message + ': ' + e.parent.detail;
    }
    const statusCode = e.statusCode ? e.statusCode : 500;
    res.status(statusCode).send(message);
  }
});

router.get("/check-user-before-delete/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    //TODO: find does this user has clients and orders

    res.status(200).send({ msg: "Пользователь может быть удален.", data: true });
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

router.delete("/delete-user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await User.destroy({
      where: { id: userId }
    });
    res.status(200).send({ msg: "Пользователь удален.", data: true });
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

function cloneDate(date) {
  //date = new Date(date);

  return String(date.getDate()).padStart(2, '0') +
    '.' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '.' +
    date.getFullYear();
}




export default router;



/*//regions

if (addresses.regions && addresses.regions.length > 0) {
 listOfCountriesIds = listOfCountriesIds.replaceAll(`, '143'`, ``);
 listOfCountriesIds = listOfCountriesIds.replaceAll(`'143', `, ``);
 listOfCountriesIds = listOfCountriesIds.replaceAll(`'143'`, ``);
 listOfCountriesIds = listOfCountriesIds + ` OR`;

 console.log('listOfCountriesIds');
 console.log(listOfCountriesIds);

 let listOfRegionsIds = `(`;
 for (let item of addresses.regions) {
   listOfRegionsIds = listOfRegionsIds + `'` + item.id + `', `;
 }
 listOfRegionsIds = listOfRegionsIds.slice(0, -2) + `)`;
 console.log('listOfRegionsIds');
 console.log(listOfRegionsIds);

 addressWhereParams.userId = {
   [Op.in]: Sequelize.literal(
     `(SELECT DISTINCT "userId" FROM addresses WHERE ${innerRestriction} "countryId" IN ${listOfCountriesIds} "regionId" IN ${listOfRegionsIds})`
   )
 }
}

   //districts

 if (addresses.districts && addresses.districts.length > 0) {
   let listOfDistrictsIds = `(`;
   for (let item of addresses.districts) {
     listOfDistrictsIds = listOfDistrictsIds + `'` + item.id + `', `;
   }
   listOfDistrictsIds = listOfDistrictsIds.slice(0, -2) + `)`;
   console.log('listOfDistrictsIds');
   console.log(listOfDistrictsIds);

   addressWhereParams.userId = {
     [Op.in]: Sequelize.literal(
       `(SELECT DISTINCT "userId" FROM addresses WHERE ${innerRestriction} "countryId" IN ${listOfCountriesIds} "districtId" IN ${listOfDistrictsIds})`
     )
   }
 }

 //localities

   if (addresses.localities && addresses.localities.length > 0) {
       let listOfLocalitiesIds = `(`;
       for (let item of addresses.localities) {
         listOfLocalitiesIds = listOfLocalitiesIds + `'` + item.id + `', `;
       }
       listOfLocalitiesIds = listOfLocalitiesIds.slice(0, -2) + `)`;
       console.log('listOfLocalitiesIds');
       console.log(listOfLocalitiesIds);

       addressWhereParams.userId = {
         [Op.in]: Sequelize.literal(
           `(SELECT DISTINCT "userId" FROM addresses WHERE ${innerRestriction} "countryId" IN ${listOfCountriesIds} "localityId" IN ${listOfLocalitiesIds})`
         )
       }
     }
  */
