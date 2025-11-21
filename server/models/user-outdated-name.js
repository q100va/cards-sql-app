import { DataTypes, Model } from 'sequelize';

export default function UserOutdatedNameModel(sequelize) {
  class UserOutdatedName extends Model { }
  UserOutdatedName.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    userName: {
      type: DataTypes.STRING
    },
    firstName: {
      type: DataTypes.STRING
    },
    patronymic: {
      type: DataTypes.STRING
    },
    lastName: {
      type: DataTypes.STRING,
    },
  },
    {
      sequelize,
      modelName: 'user-outdated-name',
      tableName: 'user-outdated-names',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return UserOutdatedName;
}


