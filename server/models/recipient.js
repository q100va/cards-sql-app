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
      dateSnapshot: {
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
      addressSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
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
        allowNull: true,
      },
      isAbsent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
    },
    {
      sequelize,
      modelName: 'recipient',
      tableName: 'recipients',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Recipient;
}
