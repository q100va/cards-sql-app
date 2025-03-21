import { DataTypes } from 'sequelize';

import sequelize from '../database.js';

const SearchUser = sequelize.define('search-user', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRestricted:
  {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

export default SearchUser;
