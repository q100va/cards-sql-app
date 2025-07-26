import { DataTypes } from 'sequelize';

import sequelize from '../database.js';

const UserAddress = sequelize.define('user-address', {
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

export default UserAddress;
