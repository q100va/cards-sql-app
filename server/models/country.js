import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import Address from './address.js';
import Region from './region.js';

const Country = sequelize.define('country', {
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
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  }
});

//Associations


export default Country;
