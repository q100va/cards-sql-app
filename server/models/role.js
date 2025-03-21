import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import User from './user.js';
import Operation from './operation.js';

const Role = sequelize.define('role', {
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
  description: {
    type: DataTypes.TEXT
  },
/*   isRestricted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dateOfRestriction: {
    type: DataTypes.DATE
  }, */

});

//Associations


export default Role;
