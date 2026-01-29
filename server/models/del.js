import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class Senior extends Model {}

Senior.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    patronymic: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM('active', 'archived'),
      defaultValue: 'active',
    },

    homeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Homes',
        key: 'id',
      },
    },

    isOutdated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Senior',
    tableName: 'Seniors',
  }
);
