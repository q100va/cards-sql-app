import { DataTypes, Model } from 'sequelize';
import CustomError from "../shared/customError.js";
import { regularExpression } from './helper-contact-re.js';

export default function UserContactModel(sequelize) {
  class UserContact extends Model { }
  UserContact.init({
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
          const pattern =
            regularExpression(
              this.type,
              value,
            );

          if (
            pattern &&
            !pattern.test(value)
          ) {
            throw new CustomError(`Invalid contact ${value}!`, 422);
          }
        }
      }
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }
  },
    {
      sequelize,
      modelName: 'user-contact',
      tableName: 'user-contacts',
      timestamps: true,

      indexes: [
        {
          name: 'idx_user_contacts_user_restricted_type',
          fields: [
            'userId',
            'isRestricted',
            'type',
          ],
        },
      ],
    });
  return UserContact;

}
