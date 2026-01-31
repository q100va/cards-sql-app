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
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      },
      confirmedPatronymic: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      },
      confirmedLastName: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      },
      confirmedBirthDate: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: false
      },
      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: false,
      },
      infoNote: {
        type: DataTypes.TEXT
      },
      photoLink: {
        type: DataTypes.TEXT
      },
      dateOfConsent: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      personalNoAddr: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      kindergarten: {
        type: DataTypes.TEXT
      },
      teacher: {
        type: DataTypes.TEXT
      },
      veteran: {
        type: DataTypes.TEXT
      },
      childOfWar: {
        type: DataTypes.TEXT
      },
      profession: {
        type: DataTypes.TEXT
      },
      honoraryStatus: {
        type: DataTypes.TEXT
      },
      interests: {
        type: DataTypes.TEXT
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
