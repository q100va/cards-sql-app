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
      timestamps: true,
      updatedAt: true, //change to false?

      indexes: [
        {
          name: 'idx_user_outdated_names_user',
          fields: [
            'userId',
          ],
        },
      ],
    });
  return UserOutdatedName;
}


