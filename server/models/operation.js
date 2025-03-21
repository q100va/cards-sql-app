import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
import Role from './role.js';

const Operation = sequelize.define('operation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    unique: false,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
/*   object: {
    type: DataTypes.STRING,
    unique: false,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },*/
  access:
  {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    //default: false,
  },
  disabled:
  {
    type: DataTypes.BOOLEAN,
    allowNull: false,
   // default: false,
  },



  /*   comment: {
      type: DataTypes.TEXT
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    dateOfRestriction: {
      type: DataTypes.DATE
    }, */

});

//Associations


export default Operation;
