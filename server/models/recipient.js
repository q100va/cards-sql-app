import { DataTypes, Model } from 'sequelize';

export default function RecipientModel(sequelize) {
  class Recipient extends Model { }

  Recipient.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      fullNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      daySnapshot: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 31,
        },
      },
      monthSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 12,
        },
      },
      yearSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      regionIdSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      homeIdSnapshot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      addressSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      acceptableForSchool: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      specialComment: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      plusAmount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      isAbsent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      occasionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      seniorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
    },
    {
      sequelize,
      modelName: 'recipient',
      tableName: 'recipients',
      timestamps: true,
      indexes: [
        {
          name: 'recipients_occasion_id_senior_id_uk',
          unique: true,
          fields: ['occasionId', 'seniorId'],
        },
        {
          name: 'recipients_active_occasion_category_plus_idx',
          fields: ['occasionId', 'category', 'plusAmount'],
          where: {
            isAbsent: false,
          },
        },
        {
          name: 'recipients_active_occasion_home_plus_idx',
          fields: ['occasionId', 'homeIdSnapshot', 'plusAmount'],
          where: {
            isAbsent: false,
          },
        },
      ],
    },
  );

  return Recipient;
}
