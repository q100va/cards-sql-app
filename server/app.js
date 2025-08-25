import express from "express";
//import pkg from 'body-parser';
//const { json, urlencoded } = pkg;
import { fileURLToPath } from 'url';
import { join } from "path";
import path from 'path';
import sequelize from './database.js';

import logger from './logging/logger.js';
import requestLogger from './middlewares/request-logger.js';
import { correlationId } from "./middlewares/correlation-id.js";
import errorHandler, { notFound } from "./controllers/error-handler.js";

import SessionApi from "./routes/session-api.js";
import AddressesApi from "./routes/addresses-api.js";
import UsersApi from "./routes/users-api.js";
import RolesApi from "./routes/roles-api.js";

import { Role, Locality, District, Region, Country, UserContact, UserAddress, User, SearchUser, Operation, OutdatedName } from './models/index.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(express.json()); */

app.use(correlationId());
app.use(requestLogger);

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
//console.log('__dirname');
//console.log(__dirname);
global.__basedir = __dirname;
app.use(express.static(join(__dirname, '../public')));

logger.info('Logger is ready');

//db connection postgres

//postgres://<db_user>:<db_password>@127.0.0.1:5432/dev_db
//TODO: migration for production
sequelize.authenticate()
  .then(() => Country.sync())
  .then(() => Region.sync())
  .then(() => District.sync())
  .then(() => Locality.sync())
  .then(() => UserContact.sync())
  .then(() => UserAddress.sync())
  .then(() => SearchUser.sync())
  .then(() => Role.sync())
  .then(() => Operation.sync())
  .then(() => User.sync())
  .then(() => OutdatedName.sync())
  .then(() => {
    logger.info('All models synced');
    const port = process.env.PORT || 8080;
    app.listen(port, () => logger.info({ port }, 'Application started'));
  })
  .catch((err) => {
    logger.error({ err }, 'Unable to initialize database');
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
app.use("/api/addresses", AddressesApi);
app.use("/api/users", UsersApi);
app.use("/api/roles", RolesApi);

// Not found and Error handlers
app.use(notFound);
app.use(errorHandler);

//Start server
const port = process.env.PORT || 8080;
app.listen(port, () => logger.info({ port }, `Application started and listening on port: ${port}`));





