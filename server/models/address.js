import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import User from './user.js';
import Country from './country.js';
import Region from './region.js';
import District from './district.js';
import Locality from './locality.js';

const Address = sequelize.define('address', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  isRestricted:
  {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

//Associations

export default Address;
