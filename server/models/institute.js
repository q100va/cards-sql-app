// server/models/partner.js
import { DataTypes, Model } from 'sequelize';

export default function InstituteModel(sequelize) {
  class Institute extends Model { }
  Institute.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      instituteName: {
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
      isRestricted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isDeletable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Institute',
      tableName: 'institutes',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Institute;
}
