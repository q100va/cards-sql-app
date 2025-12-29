import { DataTypes, Model } from 'sequelize';

export default function VolunteerSearchModel(sequelize) {
  class VolunteerSearch extends Model { }
  VolunteerSearch.init({
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
      modelName: 'volunteer-search',
      tableName: 'volunteer-searches',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return VolunteerSearch;
}


