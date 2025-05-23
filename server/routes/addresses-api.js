import { Router } from "express";
//import fs from "fs";
import path from "path";
//import { join } from "path";
//import { fileURLToPath } from 'url';



import checkAuth from "../middleware/check-auth.js";
import Country from "../models/country.js";
import Region from "../models/region.js";
import District from "../models/district.js";
import Locality from "../models/locality.js";

import { correctLocalityName } from '../controllers/addresses.js'
import { correctDistrictName } from '../controllers/addresses.js'
import CustomError from "../shared/customError.js";

import Sequelize from 'sequelize';
import Address from "../models/address.js";
const Op = Sequelize.Op;
const router = Router();

//API create toponym

router.post("/check-toponym-name", async (req, res) => {
  try {
    console.log("req.body.data");
    console.log(req.body.data);

    const type = req.body.data.type;
    const name = req.body.data.name;
    const addressFilter = req.body.data.addressFilter;
    let duplicate;
    if (type == 'country') {
      duplicate = await Country.findOne(
        {
          where: {
            name: name,
            isRestricted: false,
          },
          attributes: ['id'],
          raw: true
        }
      );
    }
    if (type == 'region') {
      duplicate = await Region.findOne(
        {
          where: {
            name: name,
            '$country.id$': addressFilter.countries[0],
            isRestricted: false,
          },
          attributes: ['id'],
          raw: true,
          include: [
            {
              model: Country,
              attributes: [],
            },
          ],
        });
    }
    if (type == 'district') {
      duplicate = await District.findOne(
        {
          where: {
            name: name,
            '$region.id$': addressFilter.regions[0],
            isRestricted: false,
          },
          attributes: ['id'],
          raw: true,
          include: [
            {
              model: Region,
              attributes: [],
            },
          ],
        });
    }
    if (type == 'locality') {
      duplicate = await Locality.findOne(
        {
          where: {
            name: name,
            '$district.id$': addressFilter.districts[0],
            isRestricted: false,
          },
          attributes: ['id'],
          raw: true,
          include: [
            {
              model: District,
              attributes: [],
            },
          ],
        });
    }
    res.status(200).send({ msg: "Данные получены.", data: duplicate });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});


router.post("/create-toponym", async (req, res) => {
  try {
    console.log("req.body.data");
    console.log(req.body.data);

    const type = req.body.data.type;
    const name = req.body.data.name;
    const shortName = req.body.data.shortName;
    const addressFilter = req.body.data.addressFilter;
    let createdToponym;
    if (type == 'country') {
      createdToponym = await Country.create(
        {
          name: name,
        }
      );
    }
    if (type == 'region') {
      createdToponym = await Region.create(
        {
          name: name,
          shortName: shortName,
          countryId: addressFilter.countries[0],
        });
    }
    if (type == 'district') {
      createdToponym = await District.create(
        {
          name: name,
          shortName: shortName,
          regionId: addressFilter.regions[0],
        });
    }
    if (type == 'locality') {
      createdToponym = await Locality.create(
        {
          name: name,
          shortName: shortName,
          districtId: addressFilter.districts[0],
          isFederalCity: req.body.data.isFederalCity,
          isCapitalOfRegion: req.body.data.isCapitalOfRegion,
          isCapitalOfDistrict: req.body.data.isCapitalOfDistrict,
        });
    }
    res.status(200).send({ msg: "Топоним успешно добавлен.", data: name });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});



// API get address elements for address filter

router.get("/get-countries-list", async (req, res) => {
  try {
    const countries = await Country.findAll({
      where: { isRestricted: false },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
      raw: true
    });
    let result = countries;
    result.sort((a, b) => (b.name === "Россия") - (a.name === "Россия"));
    res.status(200).send({ msg: "Данные получены.", data: result });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/get-regions-list", async (req, res) => {
  try {
    console.log("req.body.data");
    console.log(req.body.data);
    const countriesIds = req.body.data;//.map(item => item.id);
    let result = [];
    if (countriesIds.length > 0 && countriesIds[0]) {
      const regions = await Region.findAll({
        where: {
          isRestricted: false,
          countryId: { [Op.in]: countriesIds }
        },
        attributes: ['id', 'name', 'countryId'],
        order: [['name', 'ASC']],
        raw: true
      });
      result = regions;
    }
    res.status(200).send({ msg: "Данные получены.", data: result });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/get-districts-list", async (req, res) => {
  try {
    console.log("req.body.data");
    console.log(req.body.data);
    const regionsIds = req.body.data;//.map(item => item.id);
    let result = [];
    if (regionsIds.length > 0 && regionsIds[0]) {
      const districts = await District.findAll({
        where: {
          isRestricted: false,
          regionId: { [Op.in]: regionsIds }
        },
        attributes: ['id', 'name', 'regionId'],
        order: [['name', 'ASC']],
        raw: true,
      });
      result = districts;
    }
    res.status(200).send({ msg: "Данные получены.", data: result });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/get-localities-list", async (req, res) => {
  try {
    console.log("req.body.data");
    console.log(req.body.data);
    const districtsIds = req.body.data;//.map(item => item.id);
    let result = [];
    if (districtsIds.length > 0 && districtsIds[0]) {
      const localities = await Locality.findAll({
        where: {
          isRestricted: false,
          districtId: { [Op.in]: districtsIds }
        },
        attributes: ['id', 'name', 'districtId'],
        order: [['name', 'ASC']],
        raw: true,
      });
      result = localities;
    }
    res.status(200).send({ msg: "Данные получены.", data: result });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

// APT get toponyms for lists of toponyms

router.post("/get-countries", async (req, res) => {

  try {
    const length = await Country.count({
      where: { isRestricted: false },
    });

    let countries = await Country.findAll({
      offset: pageSize * (currentPage - 1),
      limit: pageSize,
      where: { isRestricted: false },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
      raw: true
    });
    countries.sort((a, b) => (b.name === "Россия") - (a.name === "Россия"));
    res.status(200).send({ msg: "Данные получены.", data: { toponyms: countries, length: length } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/get-regions", async (req, res) => {
  try {
    console.log("req.body.data");
    console.log(req.body.data);
    const regionsIds = req.body.data.map(item => item.id);

    const regions = await Region.findAll({
      where: {
        isRestricted: false,
        countryId: { [Op.in]: regionsIds }
      },
      attributes: ['id', 'name', 'countryId'],
      order: [['name', 'ASC']],
      raw: true
    });
    // let result = regions.map(item => item.name);
    // let result = regions;
    /*result.sort((a, b) => (b === "Москва город") - (a === "Москва город"));

       console.log("countries");
           console.log(JSON.stringify(countries)); */

    res.status(200).send({ msg: "Данные получены.", data: { toponyms: regions, length: length } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/get-districts", async (req, res) => {
  try {
    //const regions = await Region.findAll({ where: { name: { [Op.in]: req.body.data } } });
    const districtsIds = req.body.data.map(item => item.id);
    const districts = await District.findAll({
      where: {
        isRestricted: false,
        regionId: { [Op.in]: districtsIds }
      },
      attributes: ['id', 'name', 'regionId'],
      order: [['name', 'ASC']],
      raw: true,
      /*       include: [
              {
                model: Region,
                where: { id: { [Op.in]: req.body.data } },
                attributes: [],
                required: true,
              },
            ], */
    });

    /*     let districts = [];
        for (let region of regions) {
          const partOfDistricts = await region.getDistricts({
            where: { isRestricted: false, },
            attributes: ['name'],
            order: [['name', 'ASC']],
            raw: true
          });
          console.log('partOfDistricts');
          console.log(partOfDistricts);
          districts = [...districts, ...partOfDistricts];
          console.log('districts');
          console.log(districts);
        }*/
    //let result = districts;//.map(item => item.name);
    //result.sort((a, b) => (b - a));
    res.status(200).send({ msg: "Данные получены.", data: { toponyms: districts, length: length } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/get-localities", async (req, res) => {
  console.log("localities");
  const searchValue = req.body.data.filter.searchValue.trim();
  const exactMatch = req.body.data.filter.exactMatch;
  const sortParameters = req.body.data.filter.sortParameters;
  const addressFilter = req.body.data.filter.addressFilter;
  const pageSize = req.body.data.pageSize;
  const currentPage = req.body.data.currentPage;
  try {

    //sorting
    //form order: {active: [name, shortName, district, region, country], direction: [desc, asc]}
    let orderParams = [];
    let orderByName;
    let orderDirection;
    let orderModel1;
    let orderModel2;
    let orderModel3;

    if (sortParameters.direction == '') {// || (sortParameters.active == '' && sortParameters.direction == '')
      orderByName = 'name';
      orderDirection = 'ASC';
    } else {
      orderDirection = sortParameters.direction.toUpperCase();

      if (sortParameters.active == 'name' || sortParameters.active == 'shortName') {
        orderByName = sortParameters.active;
      } else {
        orderByName = 'name';
        if (sortParameters.active == 'district') {
          orderModel1 = { model: District, as: 'district' };
        }
        if (sortParameters.active == 'region') {
          orderModel1 = { model: District, as: 'district' };
          orderModel2 = { model: Region, as: 'region' };
        }
        if (sortParameters.active == 'country') {
          orderModel1 = { model: District, as: 'district' };
          orderModel2 = { model: Region, as: 'region' };
          orderModel3 = { model: Country, as: 'country' };
        }
      }
    }

    if (orderModel1) orderParams.push(orderModel1);
    if (orderModel2) orderParams.push(orderModel2);
    if (orderModel3) orderParams.push(orderModel3);
    orderParams.push(orderByName);
    orderParams.push(orderDirection);

    console.log("orderParams");
    console.log(orderParams);

    //search

    let whereParams = {};
    //let searchWhereParams = {};
    let searchParams = [];
    whereParams.isRestricted = false;
    if (searchValue) {
      const searchColumnNames = ['$district.region.country.name$', '$district.region.name$', '$district.region.shortName$', '$district.name$', '$district.shortName$', 'name', 'shortName'];
      let arrayOfSearchValues = searchValue.split(" ");
      console.log('arrayOfSearchValues');
      console.log(arrayOfSearchValues);
      if (!exactMatch || (exactMatch && arrayOfSearchValues.length == 1)) {
        let opLikeValues = [];
        for (let i = 0; i < arrayOfSearchValues.length; i++) {
          opLikeValues.push({ [Op.iLike]: '%' + arrayOfSearchValues[i] + '%' });
        }
        for (let columnName of searchColumnNames) {
          searchParams.push({
            [columnName]: {
              [Op.or]: opLikeValues
            }
          });
          console.log("opLikeValues");
          console.log(opLikeValues);
        }
        whereParams = { ...whereParams, [Op.or]: searchParams };
        console.log("whereParams");
        console.log(whereParams);
      } else {
        //all search words in one column
        /*         const opLikeValues = { [Op.iLike]: '%' + searchValue + '%' };

                for (let columnName of searchColumnNames) {
                  searchParams.push({
                    [columnName]: opLikeValues
                  });
                  console.log("opLikeValues");
                  console.log(opLikeValues);
                }

                whereParams = { ...whereParams, [Op.or]: searchParams }; */

        //search words in different columns
        const searchColumnRowNames = [
          '"district->region->country"."name"',
          '"district->region"."name"', '"district->region"."shortName"',
          '"district"."name"', '"district"."shortName"',
          '"locality"."name"', '"locality"."shortName"'
        ];
        let innerQuery = '';

        for (let i = 0; i < arrayOfSearchValues.length; i++) {
          innerQuery = innerQuery + '(SELECT DISTINCT "locality"."id" WHERE "locality"."isRestricted" = false AND (';
          const searchWord = "'%" + arrayOfSearchValues[i] + "%'";
          console.log("searchWord");
          console.log(searchWord);
          for (let columnName of searchColumnRowNames) {
            innerQuery = innerQuery + ' ' + columnName + ' ILIKE ' + searchWord + ' OR ';
          }
          innerQuery = innerQuery.slice(0, -4) + `)`;
          console.log("innerQuery");
          console.log(innerQuery);
          if (i != arrayOfSearchValues.length - 1) {
            innerQuery = innerQuery + 'AND  "locality"."id" IN ';
          }
        }
        for (let i = 0; i < arrayOfSearchValues.length; i++) {
          innerQuery = innerQuery + ')';
        }

        console.log("innerQueryFinal");
        console.log(innerQuery);


        /*         addressWhereParams.userId = {
                  [Op.in]: Sequelize.literal(
                    `(SELECT DISTINCT "userId" FROM addresses WHERE ${innerRestriction} "countryId" IN ${listOfCountriesIds})`
                  )
         */

        /* SELECT "locality"."id", "locality"."name", "locality"."shortName", "district"."id" AS "district.id", "district"."name" AS "district.name", "district->region"."id" AS "district.region.id", "district->region"."name" AS "district.region.name", "district->region->country"."id" AS "district.region.country.id", "district->region->country"."name" AS "district.region.country.name"
        FROM "localities" AS "locality"
        LEFT OUTER JOIN "districts" AS "district" ON "locality"."districtId" = "district"."id"
        LEFT OUTER JOIN "regions" AS "district->region" ON "district"."regionId" = "district->region"."id"
        LEFT OUTER JOIN "countries" AS "district->region->country" ON "district->region"."countryId" = "district->region->country"."id"
        WHERE "locality"."id" IN
        (SELECT "locality"."id"
        WHERE "locality"."isRestricted" = false AND
        ("district->region->country"."name" ILIKE '%аверино%'
        OR "district->region"."name" ILIKE '%аверино%' OR "district->region"."shortName" ILIKE '%аверино%'
        OR "district"."name" ILIKE '%аверино%' OR "district"."shortName" ILIKE '%аверино%'
        OR "locality"."name" ILIKE '%аверино%' OR "locality"."shortName" ILIKE '%аверино%')
        AND  "locality"."id" IN
        (SELECT "locality"."id"
        WHERE (("district->region->country"."name" LIKE '%сысертский%')
        OR ("district->region"."name" ILIKE '%сысертский%') OR ("district->region"."shortName" ILIKE '%сысертский%')
        OR ("district"."name" ILIKE '%сысертский%') OR ("district"."shortName" ILIKE '%сысертский%')
        OR ("locality"."name" ILIKE '%сысертский%') OR ("locality"."shortName" ILIKE '%сысертский%'))
        AND "locality"."isRestricted" = false)); */

        searchParams.push({
          id: {
            [Op.in]: Sequelize.literal(innerQuery),
          }
        });
        whereParams = { ...whereParams, [Op.or]: searchParams };
      }

    }

    //filter
    if (addressFilter.localities && addressFilter.localities.length > 0) {
      whereParams.id = addressFilter.localities[0];
    } else
      if (addressFilter.districts && addressFilter.districts.length > 0) {
        whereParams['$district.id$'] = addressFilter.districts[0];
      } else
        if (addressFilter.regions && addressFilter.regions.length > 0) {
          whereParams['$district.region.id$'] = addressFilter.regions[0];
        } else
          if (addressFilter.countries && addressFilter.countries.length > 0) {
            whereParams['$district.region.country.id$'] = addressFilter.countries[0];
          }



    const length = await Locality.count({
      where: whereParams,
      include: [
        {
          model: District,
          attributes: [],
          include: [
            {
              model: Region,
              attributes: [],
              include: [
                {
                  model: Country,
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    });

    let localities = await Locality.findAll({
      offset: pageSize * (currentPage - 1),
      limit: pageSize,

      attributes: ['id', 'name', 'shortName'],
      order: [orderParams],
      raw: true,
      where: whereParams,
      /* {
        { isRestricted: false },
        [Op.or]: [
          {
            '$district.region.country.name$': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },

          {
            '$district.region.name$': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },
          {
            '$district.region.shortName$': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },
          {
            '$district.name$': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },
          {
            '$district.shortName$': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },
          {
            'name': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },
          {
            'shortName': {
              [Op.or]: [{ [Op.like]: '%Сысертский%' }, { [Op.like]: '%Аверино%' },]
            }
          },
        ]
      },*/
      include: [
        {
          model: District,
          attributes: ['id', 'name'],
          include: [
            {
              model: Region,
              attributes: ['id', 'name'],
              include: [
                {
                  model: Country,
                  attributes: ['id', 'name'],
                },
              ],
            },
          ],
        },
      ],
    });
    //console.log("localities");
    //console.log(localities);

    res.status(200).send({ msg: "Данные получены.", data: { toponyms: localities, length: length } });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});


// API populate address elements

router.get("/download/:filename", async (req, res) => {
  console.log("filename");
  console.log(req.params.filename);
  /*   const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
    const __dirname = path.dirname(__filename);
    const filename = req.params.filename;
    const directoryPath = path.join(__dirname, '../../public', filename); // Assuming files are stored in a 'files' directory */

  const filename = req.params.filename;
  const filePath = path.join(__basedir, '../public', filename)

  console.log(filePath);

  res.download(filePath, (e) => {
    if (e) {
      console.log('error file');
      console.log(e);
      let message = `Произошла ошибка:  ${e.message}`;
      console.log(message);
      const statusCode = e.statusCode ? e.statusCode : 500;
      res.status(statusCode).send(message);
      //TODO: не приходит текст ошибки, как здесь
      return;
    }
  });
});



router.post("/populate-country", async (req, res) => {
  try {
    const countries = req.body.data;
    for (let country of countries) {
      await Country.create(country);
    }
    res.status(200).send({ msg: "Таблица успешно пополнена." });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/populate-region", async (req, res) => {
  try {
    const regions = req.body.data;
    for (let region of regions) {
      const newRegion = await Region.create({
        code: region.code,
        name: region.name,
        shortName: region.shortName,
      });
      const country = await Country.findOne({ where: { name: region.country } });
      if (country === null) {
        await Region.destroy({
          where: {
            id: newRegion.id,
          },
        });
        throw new CustomError(`Страна "${region.country}" не найдена в базе данных! Ввод прекращен.`, 422);
      } else {
        await newRegion.setCountry(country);
      }
    }
    res.status(200).send({ msg: "Таблица успешно пополнена." });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/populate-district", async (req, res) => {
  try {
    const districts = req.body.data;
    /*     console.log("districts");
        console.log(districts); */
    for (let district of districts) {
      let districtData;
      try {
        districtData = correctDistrictName(district.name, district.postName, district.postNameType);
      } catch (e) {
        throw new CustomError(e.message, 422);
      }
      console.log("districtData");
      console.log(districtData);
      //TODO: в разных регионах могут быть одинаковые названия округов/районов
      const newDistrict = await District.create({
        name: districtData.name,
        shortName: districtData.shortName,
        postName: districtData.postName,
        shortPostName: districtData.shortPostName,
      });
      const region = await Region.findOne({ where: { name: district.region } });
      if (region === null) {
        await District.destroy({
          where: {
            id: newDistrict.id,
          },
        });
        throw new CustomError(`Регион "${district.region}" не найден в базе данных! Ввод прекращен.`, 422);
      } else {
        await newDistrict.setRegion(region);
      }
    }
    res.status(200).send({ msg: "Таблица успешно пополнена." });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.post("/populate-locality", async (req, res) => {
  try {
    const localities = Array.from(new Set(req.body.data));
    /*     console.log("localities");
        console.log(localities); */

    for (let locality of localities) {
      let localityData;
      try {
        localityData = correctLocalityName(locality.name, locality.type, locality.district);
      } catch (e) {
        throw new CustomError(e.message, 422);
      }
      console.log("localityData");
      console.log(localityData);
      const newLocality = await Locality.create({
        name: localityData.name,
        shortName: localityData.shortName,
        isCapitalOfDistrict: locality.isCapitalOfDistrict,
        isCapitalOfRegion: locality.isCapitalOfRegion,
        isFederalCity: locality.isFederalCity,
      });
      //TODO: в разных регионах могут быть одинаковые названия округов/районов -TEST

      const district = await District.findOne(
        {
          where: { name: localityData.districtFullName, isRestricted: false, '$region.name$': locality.region },
          include: [
            {
              model: Region,
              attributes: [],
            }
          ]
        }
      );
      if (district === null) {
        throw new CustomError(`"${locality.district}" не найден в базе данных! Ввод прекращен.`, 422);
      } else {
        await newLocality.setDistrict(district);
      }
    }
    res.status(200).send({ msg: "Таблица успешно пополнена." });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

//delete toponym

router.get("/check-toponym-before-block/:type/:id", async (req, res) => {
  try {
    const toponymId = req.params.id;
    const toponymType = req.params.type;

    const foundToponymId = await Address.findOne({
      where: {
        isRestricted: false,
        [toponymType + 'Id']: toponymId,
      },
      attributes: ['id'],
    }
    );
    console.log("foundToponymId");
    console.log(foundToponymId);

    //TODO: find does this toponym has houses(?)

    res.status(200).send({ msg: "Топоним может быть удален.", data: !foundToponymId });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.get("/check-toponym-before-delete/:type/:id", async (req, res) => {
  try {
    const toponymId = req.params.id;
    const toponymType = req.params.type;

    const foundToponymId = await Address.findOne({
      where: {
        [toponymType + 'Id']: toponymId,
      },
      attributes: ['id'],
    }
    );
    console.log("foundToponymId");
    console.log(foundToponymId);

    //TODO: find does this toponym has houses(?)

    res.status(200).send({ msg: "Топоним может быть удален.", data: !foundToponymId });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.delete("/delete-toponym/:type/:id", async (req, res) => {
  try {
    //throw new Error(`Ввод прекращен.`);
    const toponymId = req.params.id;
    const toponymType = req.params.type;
    const toponym = toponymType[0].toUpperCase() + toponymType.substring(1);
    let Toponym = setToponym(toponym);
    await Toponym.destroy({
      where: { id: toponymId }
    });
    res.status(200).send({ msg: "Топоним удален.", data: true });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

router.patch("/block-toponym/:type/:id", async (req, res) => {
  try {
    const toponymId = req.params.id;
    const toponymType = req.params.type;
    const toponym = toponymType[0].toUpperCase() + toponymType.substring(1);
    let Toponym = setToponym(toponym);
    await Toponym.update(
      {
        isRestricted: true,
      },
      {
        where: { id: toponymId }
      },
    );
    res.status(200).send({ msg: "Топоним заблокирован.", data: true });
  } catch (e) {
    const err = errorHandling(e);
    res.status(err.statusCode).send(err.message);
  }
});

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

function setToponym(toponym) {
  let Toponym;
  switch (toponym) {
    case 'Locality':
      Toponym = Locality;
      break;
    case 'District':
      Toponym = District;
      break;
    case 'Region':
      Toponym = Region;
      break;
    case 'Country':
      Toponym = Country;
      break;
  }
  return Toponym;
}







export default router;
