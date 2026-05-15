// server/models/occasion.js
import { DataTypes, Model } from 'sequelize';

export default function RecipientModel(sequelize) {
  class Recipient extends Model { }
  Recipient.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      fullNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      daySnapshot: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      monthSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      yearSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      regionIdSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      homeIdSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      addressSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      acceptableForSchool: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      specialComment: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      plusAmount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isAbsent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      occasionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      seniorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'recipient',
      tableName: 'recipients',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
      indexes: [
        {
          unique: true,
          fields: ['occasionId', 'seniorId'],
        },
      ]
    }
  );
  return Recipient;
}
