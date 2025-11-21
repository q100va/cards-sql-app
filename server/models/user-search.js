import { DataTypes, Model } from 'sequelize';

export default function UserSearchModel(sequelize) {
  class UserSearch extends Model { }
  UserSearch.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRestricted:
    {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
    {
      sequelize,
      modelName: 'user-search',
      tableName: 'user-searches',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return UserSearch;
}
