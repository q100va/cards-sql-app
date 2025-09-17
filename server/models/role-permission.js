import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const RolePermission = sequelize.define('role-permission', {
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
  access:
  {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  disabled:
  {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
});

export default RolePermission;
