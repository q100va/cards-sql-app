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
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      patronymic: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(50),
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
        allowNull: true,
      },
      photoLink: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dateOfConsent: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      personalNoAddr: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      kindergarten: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      teacher: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      veteran: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      childOfWar: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      profession: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      honoraryStatus: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      interests: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      orthodoxBeliever: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dateOfStart: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isRestricted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      causeOfRestriction: {
        type: DataTypes.TEXT,
        defaultValue: null
      },
      dateOfRestriction: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dateOfExit: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'senior',
      tableName: 'seniors',
      underscored: false,
      timestamps: true,
    }
  );
  return Senior;
}
