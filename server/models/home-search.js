import { DataTypes, Model } from 'sequelize';

export default function HomeSearchModel(sequelize) {
  class HomeSearch extends Model { }
  HomeSearch.init({
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
    },
  },
    {
      sequelize,
      modelName: 'home-search',
      tableName: 'home-searches',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return HomeSearch;
}



