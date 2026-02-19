import { DataTypes, Model } from 'sequelize';

export default function SeniorSearchModel(sequelize) {
  class SeniorSearch extends Model { }
  SeniorSearch.init({
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
      modelName: 'senior-search',
      tableName: 'senior-searches',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return SeniorSearch;
}


