// server/models/partner.js
import { DataTypes, Model } from 'sequelize';

export default function VolunteerModel(sequelize) {
  class Volunteer extends Model { }
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
        }
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
        type: DataTypes.TEXT
      },
      dateOfStart: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
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

    },
    {
      sequelize,
      modelName: 'volunteer',
      tableName: 'volunteers',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Volunteer;
}
