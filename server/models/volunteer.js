import { DataTypes, Model } from 'sequelize';

export default function VolunteerModel(sequelize) {
  class Volunteer extends Model {}

  Volunteer.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      patronymic: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      dateOfStart: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      isRestricted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      causeOfRestriction: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      dateOfRestriction: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'volunteer',
      tableName: 'volunteers',
      underscored: false,
      timestamps: true,
    },
  );

  return Volunteer;
}
