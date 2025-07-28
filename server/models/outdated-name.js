import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
const OutdatedName = sequelize.define('outdated-name', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  userName: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  firstName: {
    type: DataTypes.STRING,
  },
  patronymic: {
    type: DataTypes.STRING
  },
  lastName: {
    type: DataTypes.STRING,
  },
/*   dateOfRestriction: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    validate: {
      notEmpty: true,
    }
  }, */
});

export default OutdatedName;
