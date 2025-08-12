import { Router } from "express";
//import { compareSync, hashSync } from "bcryptjs";
import pkg from 'bcryptjs';
const { compareSync, hashSync } = pkg;
//import { sign } from "jsonwebtoken";
import pkg2 from 'jsonwebtoken';
const { sign } = pkg2;

//const User = require("../models/user");

const router = Router();
const saltRounds = 10;

import checkAuth from "../middlewares/check-auth.js";

//TODO: added protection against multiple requests from same IP-address or with same userName

router.post("/sign-in", async (req, res) => {
  try {
    res.status(200).send({ msg: "Успешная аутентификация." });

/*         const user = await User.findOne({ userName: req.body.userName }); //TODO: change on Sequelise
        if (user) {
          let passwordIsValid = compareSync(req.body.password, user.password);

          if (passwordIsValid) {
            console.log("Login Successful");
            const token = sign({
              userName: user.userName,
              userId: user._id
            },
              'Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.',
              { expiresIn: "4h" }
            );
            res.status(200).send({ msg: "Успешная аутентификация.", data: { user: user, token: token, expiresIn: 14400 } });
          } else {
            console.log(`Invalid password for username: ${user.userName}`);
            res.status(401).send("Неверное имя пользователя или пароль. Попробуйте снова.");
          }
        } else {
          console.log(`Username: ${req.body.userName} is invalid`);
          res.status(401).send("Неверное имя пользователя или пароль. Попробуйте снова.");
        } */
  } catch (e) {
    console.log(e);
    res.status(500).send(`Произошла ошибка:  ${e.message}`);
  }
});



//Reset Password API

router.post("/users/:userName/reset-password", checkAuth, async (req, res) => {
  try {
    const password = req.body.password;

    User.findOne({ userName: req.params.userName }, function (err, user) {
      if (err) {
        console.log(err);
        const resetPasswordMongodbErrorResponse = new BaseResponse("500", "Internal server error", err);
        res.status(500).send(resetPasswordMongodbErrorResponse.toObject());
      } else {
        console.log(user);
        //Salt and hash the password
        let hashedPassword = hashSync(password, saltRounds);

        user.set({
          password: hashedPassword,
        });

        user.save(function (err, updatedUser) {
          if (err) {
            console.log(err);
            const updatedUserMongodbErrorResponse = new BaseResponse("500", "Internal server error", err);
            res.status(500).send(updatedUserMongodbErrorResponse.toObject());
          } else {
            console.log(updatedUser);
            const updatedPasswordResponse = new BaseResponse("200", "Query Successful", updatedUser);
            res.json(updatedPasswordResponse.toObject());
          }
        });
      }
    });
  } catch (e) {
    console.log(e);
    const resetPasswordCatchError = new BaseResponse("500", "Internal server error", e);
    res.status(500).send(resetPasswordCatchError.toObject());
  }
});

export default router;




//********/

/* const express = require("express");
const bcrypt = require("bcryptjs");
//const User = require("../models/user");

const router = express.Router();
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const checkAuth = require("../middlewares/check-auth");

//TODO: added protection against multiple requests from same IP-address or with same userName

router.post("/sign-in", async (req, res) => {
  try {
   // res.status(200).send({ msg: "Успешная аутентификация!" });

        const user = await User.findOne({ userName: req.body.userName }); //TODO: change on Sequelise
        if (user) {
          let passwordIsValid = bcrypt.compareSync(req.body.password, user.password);

          if (passwordIsValid) {
            console.log("Login Successful");
            const token = jwt.sign({
              userName: user.userName,
              userId: user._id
            },
              'Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.',
              { expiresIn: "4h" }
            );
            res.status(200).send({ msg: "Успешная аутентификация!", data: { user: user, token: token, expiresIn: 14400 } });
          } else {
            console.log(`Invalid password for username: ${user.userName}`);
            res.status(401).send("Неверное имя пользователя или пароль. Попробуйте снова.");
          }
        } else {
          console.log(`Username: ${req.body.userName} is invalid`);
          res.status(401).send("Неверное имя пользователя или пароль. Попробуйте снова.");
        }
  } catch (e) {
    console.log(e);
    res.status(500).send(`Произошла ошибка:  ${e.message}`);
  }
});



//Reset Password API

router.post("/users/:userName/reset-password", checkAuth, async (req, res) => {
  try {
    const password = req.body.password;

    User.findOne({ userName: req.params.userName }, function (err, user) {
      if (err) {
        console.log(err);
        const resetPasswordMongodbErrorResponse = new BaseResponse("500", "Internal server error", err);
        res.status(500).send(resetPasswordMongodbErrorResponse.toObject());
      } else {
        console.log(user);
        //Salt and hash the password
        let hashedPassword = bcrypt.hashSync(password, saltRounds);

        user.set({
          password: hashedPassword,
        });

        user.save(function (err, updatedUser) {
          if (err) {
            console.log(err);
            const updatedUserMongodbErrorResponse = new BaseResponse("500", "Internal server error", err);
            res.status(500).send(updatedUserMongodbErrorResponse.toObject());
          } else {
            console.log(updatedUser);
            const updatedPasswordResponse = new BaseResponse("200", "Query Successful", updatedUser);
            res.json(updatedPasswordResponse.toObject());
          }
        });
      }
    });
  } catch (e) {
    console.log(e);
    const resetPasswordCatchError = new BaseResponse("500", "Internal server error", e);
    res.status(500).send(resetPasswordCatchError.toObject());
  }
});

module.exports = router;
 */
