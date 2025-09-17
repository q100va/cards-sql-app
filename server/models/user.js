import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import { applyFailedLoginState, applySuccessfulLoginReset, SECURITY } from '../controllers/auth-throttle.js';

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

User.prototype.registerFailedLogin = async function (now = new Date(), cfg = SECURITY, { transaction } = {}) {
  const { nextState, events } = applyFailedLoginState(this.toJSON(), now, cfg);
  this.failedLoginCount = nextState.failedLoginCount;
  this.lockedUntil = nextState.lockedUntil;
  this.bruteWindowStart = nextState.bruteWindowStart;
  this.bruteStrikeCount = nextState.bruteStrikeCount;
  this.isRestricted = nextState.isRestricted;
  this.causeOfRestriction = nextState.causeOfRestriction;
  this.dateOfRestriction = nextState.dateOfRestriction;
  await this.save({ transaction });
  return { events, state: nextState };
};

// ❷ Сброс после успешного входа
User.prototype.resetAfterSuccess = async function ({ transaction } = {}) {
  const { nextState, touched } = applySuccessfulLoginReset(this.toJSON());
  if (touched) {
    this.failedLoginCount = 0;
    this.lockedUntil = null;
    await this.save({ transaction });
  }
  return { touched };
};


export default User;
