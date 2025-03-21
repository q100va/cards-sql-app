import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import Role from './role.js';
import Locality from './locality.js';
import District from './district.js';
import Region from './region.js';
import Country from './country.js';
import Address from './address.js';
import Contact from './contact.js';

const User = sequelize.define('user', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  dateOfStart: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  userName: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  patronymic: {
    type: DataTypes.STRING
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  comment: {
    type: DataTypes.TEXT
  },
  isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  causeOfRestriction: {
    type: DataTypes.TEXT
  },
  dateOfRestriction: {
    type: DataTypes.DATE
  },
});

//Associations

/* User.belongsToMany(Country, { through: 'Address' });
User.belongsToMany(Region, { through: 'Address' });
User.belongsToMany(District, { through: 'Address' });
User.belongsToMany(Locality, { through: 'Address' }); */



export default User;
