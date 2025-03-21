import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import Address from './address.js';
import Region from './region.js';
import Locality from './locality.js';

const District = sequelize.define('district', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
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
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    }
  },
  postName: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  shortPostName: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  }

});

//Associations


export default District;
