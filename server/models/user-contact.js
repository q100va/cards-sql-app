import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import CustomError from "../shared/customError.js";

const UserContact = sequelize.define('user-contact', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  content: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isFormatCorrect(value) {
        let RegularExpression;
        switch (this.type) {
          case "email":
            RegularExpression = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            break;
          case "phoneNumber":
            if (value.startsWith('+7')) {
              RegularExpression = /^((\+7)+([0-9]){10})$/;
            } else {
              RegularExpression = /^\+[1-9]{1}[0-9]{0,2}[2-9]{1}[0-9]{1,2}[0-9]{3}[0-9]{4}$/;
            }
            break;
          case "whatsApp":
            if (value.startsWith('+7')) {
              RegularExpression = /^((\+7)+([0-9]){10})$/;
            } else {
              RegularExpression = /^\+[1-9]{1}[0-9]{0,2}[2-9]{1}[0-9]{1,2}[0-9]{3}[0-9]{4}$/;
            }
            break;
          case "telegramId":
            RegularExpression = /^(\#+([0-9]){8,10})$/;
            break;
          case "telegramNickname":
            RegularExpression = /^@[A-Za-z0-9_]{5,32}$/;
            break;
          case "telegramPhoneNumber":
            if (value.startsWith('+7')) {
              RegularExpression = /^((\+7)+([0-9]){10})$/;
            } else {
              RegularExpression = /^\+[1-9]{1}[0-9]{0,2}[2-9]{1}[0-9]{1,2}[0-9]{3}[0-9]{4}$/;
            }
            break;
          case "vKontakte":
            RegularExpression = /^([A-Za-z0-9](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}(?:[A-Za-z0-9]))?)$/;
            break;
          case "instagram":
            RegularExpression = /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/;
            break;
          case "facebook":
            RegularExpression = /^[A-Za-z0-9_\.]{5,}$/;
            break;
          default:
            if (this.type != "otherContact") {
              throw new CustomError(`Неверный тип контакта ${this.type}!`, 422);
            }
        }
        if (RegularExpression && !RegularExpression.test(value)) {
          throw new CustomError(`Неверный формат контакта ${value}!`, 422);
        }
      }
    }
  },
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});



//Associations


export default UserContact;
