// server/models/senior.js
import { DataTypes, Model } from 'sequelize';

export default function SeniorModel(sequelize) {
  class Senior extends Model { }
  Senior.init(
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
      birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      confirmedFirstName: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      confirmedPatronymic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      confirmedLastName: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      confirmedBirthDate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: false,
      },
      infoNote: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      photoLink: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      dateOfConsent: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      },
      personalNoAddr: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      kindergarten: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      teacher: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      veteran: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      childOfWar: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      profession: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      honoraryStatus: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      interests: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      orthodoxBeliever: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      comment: {
        type: DataTypes.TEXT,
        defaultValue: null
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
        type: DataTypes.TEXT,
        defaultValue: null
      },
      dateOfRestriction: {
        type: DataTypes.DATE,
        defaultValue: null
      },
      dateOfExit: {
        type: DataTypes.DATE,
        defaultValue: null
      },
    },
    {
      sequelize,
      modelName: 'senior',
      tableName: 'seniors',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Senior;
}
