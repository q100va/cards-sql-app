import { DataTypes, Model } from 'sequelize';
import CustomError from "../shared/customError.js";
import { regularExpression } from './helper-contact-re.js';

export default function VolunteerContactModel(sequelize) {
  class VolunteerContact extends Model { }
  VolunteerContact.init({
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
          const RegularExpression = regularExpression(this.type, value);
          if (RegularExpression && !RegularExpression.test(value)) {
            throw new CustomError(`Invalid contact ${value}!`, 422);
          }
        }
      }
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

  },
    {
      sequelize,
      modelName: 'volunteer-contact',
      tableName: 'volunteer-contacts',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return VolunteerContact;

}


