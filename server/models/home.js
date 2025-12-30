// server/models/home.js
import { DataTypes, Model } from 'sequelize';

export default function HomeModel(sequelize) {
  class Home extends Model { }
  Home.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      homeName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      officialName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      postalName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      noAddress: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      specialHome: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      acceptableForSchool: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      comment: {
        type: DataTypes.TEXT
      },
      infoNote: {
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
      modelName: 'home',
      tableName: 'homes',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Home;
}
