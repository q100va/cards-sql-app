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
      allowNull: false,
      defaultValue: false
    },
  },
    {
      sequelize,
      modelName: 'home-search',
      tableName: 'home-searches',
      timestamps: true,
      indexes: [
        {
          name: 'uq_home_searches_home_restricted',
          unique: true,
          fields: ['homeId', 'isRestricted'],
        },
      ],
    });
  return HomeSearch;
}



