import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import Address from './address.js';
import District from './district.js';

const Locality = sequelize.define('locality', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  shortName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  isFederalCity: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isCapitalOfRegion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isCapitalOfDistrict: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  }
});

//Associations


export default Locality;
