import { DataTypes } from 'sequelize';

import sequelize from '../database.js';
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
  failedLoginCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  bruteWindowStart: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  bruteStrikeCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

//Associations

/* User.belongsToMany(Country, { through: 'UserAddress' });
User.belongsToMany(Region, { through: 'UserAddress' });
User.belongsToMany(District, { through: 'UserAddress' });
User.belongsToMany(Locality, { through: 'UserAddress' }); */



export default User;
