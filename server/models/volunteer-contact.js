import { DataTypes, Model } from 'sequelize';
import CustomError from '../shared/customError.js';
import { regularExpression } from './helper-contact-re.js';

export default function VolunteerContactModel(sequelize) {
  class VolunteerContact extends Model {}

  VolunteerContact.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      content: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,

          isFormatCorrect(value) {
            const pattern =
              regularExpression(
                this.type,
                value,
              );

            if (
              pattern &&
              !pattern.test(value)
            ) {
              throw new CustomError(
                'ERRORS.CONTACT.INVALID_FORMAT',
                422,
              );
            }
          },
        },
      },

      isRestricted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'volunteer-contact',
      tableName: 'volunteer-contacts',
      timestamps: true,
    },
  );

  return VolunteerContact;
}
