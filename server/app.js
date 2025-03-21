import express from "express";
import pkg from 'body-parser';
const { json, urlencoded } = pkg;
import { fileURLToPath } from 'url';
import { join } from "path";
import path from 'path';



const app = express();
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
console.log('__dirname');
console.log(__dirname);
global.__basedir = __dirname;
app.use(express.static(join(__dirname, '../public')));

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

//Start server
app.listen(8080);
console.log(`Application started and listening on port: 8080`);





