//import { verify } from "jsonwebtoken";
import pkg from 'jsonwebtoken';
const { verify } = pkg;

export default (req, res, next) => {
  try {
      const token = req.headers.authorization.split(" ")[1];
      verify(token, "Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.");
      next();
  } catch (error) {
      res.status(401).json({ msg: "Отказано в авторизации!" });
  }
};


//*********/
/* const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, "Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.");
      next();
  } catch (error) {
      res.status(401).json({ msg: "Отказано в авторизации!" });
  }
}; */
