import express from "express";
import pkg from 'body-parser';
const { json, urlencoded } = pkg;
import { fileURLToPath } from 'url';
import { join } from "path";
import path from 'path';
import sequelize from './database.js';
/* import 'dotenv/config';
import { config } from 'dotenv';
config({ debug: true, override: true }); */

import SessionApi from "./routes/session-api.js";

const app = express();
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
//console.log(dotenv.config());

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
//console.log('__dirname');
//console.log(__dirname);
global.__basedir = __dirname;
app.use(express.static(join(__dirname, '../public')));

//db connection postgres

//postgres://<db_user>:<db_password>@127.0.0.1:5432/dev_db

sequelize
  .authenticate()
  //.then(Country.sync())
  //.then(Region.sync())
  //.then(District.sync())
  //.then(Locality.sync())
  //.then(Contact.sync())
  //.then(Address.sync())
  //.then(SearchUser.sync())
  //.then(Role.sync())
 // .then(Operation.sync())
  //.then(User.sync())
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch((err) => {
    console.log('Unable to connect to the database:', err);
  });

// CORS

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");// allow all domains
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

//API(s)

app.use("/api/session", SessionApi);
/* app.use("/api/addresses", AddressesApi);
app.use("/api/users", UsersApi);
app.use("/api/roles", RolesApi);
 */
//Start server
app.listen(8080);
console.log(`Application started and listening on port: 8080`);





