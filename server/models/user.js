import { DataTypes, Model } from 'sequelize';
import { applyFailedLoginState, applySuccessfulLoginReset, SECURITY } from '../controllers/auth-throttle.js';

export default function UserModel(sequelize) {
  class User extends Model { }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      dateOfStart: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      },
      userName: {
        type: DataTypes.STRING,
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
        defaultValue: false,
        allowNull: false
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
    },
    {
      sequelize,
      modelName: 'user',
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          name: 'uq_users_username_ci',
          unique: true,
          fields: [
            sequelize.fn(
              'lower',
              sequelize.col('userName'),
            ),
          ],
        },
      ],
    },

  );

  User.prototype.registerFailedLogin =
    async function (now = new Date(), cfg = SECURITY, { transaction } = {}) {
      const { nextState, events } =
        applyFailedLoginState(
          this.toJSON(), now, cfg
        );
      this.failedLoginCount = nextState.failedLoginCount;
      this.lockedUntil = nextState.lockedUntil;
      this.bruteWindowStart = nextState.bruteWindowStart;
      this.bruteStrikeCount = nextState.bruteStrikeCount;
      this.isRestricted = nextState.isRestricted;
      this.causeOfRestriction = nextState.causeOfRestriction;
      this.dateOfRestriction = nextState.dateOfRestriction;
      await this.save({ transaction });
      return {
        events, state: nextState
      };
    };

  // reset after successful login
  User.prototype.resetAfterSuccess =
    async function ({ transaction } = {}) {
      const { nextState, touched } =
        applySuccessfulLoginReset(
          this.toJSON(),
        );

      if (touched) {
        this.failedLoginCount =
          nextState.failedLoginCount;

        this.lockedUntil =
          nextState.lockedUntil;

        await this.save({
          transaction,
        });
      }

      return { touched };
    };

  return User;
}
