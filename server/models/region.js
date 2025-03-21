import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import Address from './address.js';
import District from './district.js';
import Country from './country.js';

const Region = sequelize.define('region', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(4),
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  shortName: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  isAvailableForClients: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  }
});

//Associations

export default Region;
