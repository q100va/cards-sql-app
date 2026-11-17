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
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      officialName: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      noAddress: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      specialHome: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      acceptableForSchool: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      infoNote: {
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
      isClose: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      dateOfClose: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'home',
      tableName: 'homes',
      underscored: false,
      timestamps: true,
    }
  );
  return Home;
}
