import { DataTypes, Model, Op } from 'sequelize';
import {
  OCCASION_TYPE,
} from '../../shared/dist/constants/occasions.js';

export default function OccasionModel(sequelize) {
  class Occasion extends Model { }

  Occasion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 12,
        },
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 2022,
        },
      },
      type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 6,
        },
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        validate: {
          min: 1,
          max: 2,
        },
      },
    },
    {
      sequelize,
      modelName: 'occasion',
      tableName: 'occasions',
      timestamps: true,
      validate: {
        monthByOccasionType() {
          if (
            this.type === OCCASION_TYPE.BIRTHDAY &&
            this.month == null
          ) {
            throw new Error('Month is required for birthday occasions.');
          }

          if (
            this.type !== OCCASION_TYPE.BIRTHDAY &&
            this.month != null
          ) {
            throw new Error('Month is only allowed for birthday occasions.');
          }
        },
      },
      indexes: [
        {
          name: 'occasions_birthday_year_month_uk',
          unique: true,
          fields: ['type', 'year', 'month'],
          where: {
            type: OCCASION_TYPE.BIRTHDAY,
          },
        },
        {
          name: 'occasions_type_year_uk',
          unique: true,
          fields: ['type', 'year'],
          where: {
            type: {
              [Op.ne]: OCCASION_TYPE.BIRTHDAY,
            },
            month: null,
          },
        },
      ],
    },
  );

  return Occasion;
}
