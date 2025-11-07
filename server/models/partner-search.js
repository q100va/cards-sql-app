import { DataTypes, Model } from 'sequelize';

export default function PartnerSearchModel(sequelize) {
  class PartnerSearch extends Model { }
  PartnerSearch.init({
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
      modelName: 'partner-search',
      tableName: 'partner-searches',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return PartnerSearch;
}


