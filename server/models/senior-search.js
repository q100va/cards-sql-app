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
    isRestricted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
    {
      sequelize,
      modelName: 'senior-search',
      tableName: 'senior-searches',
      timestamps: true,
      indexes: [
        {
          name: 'uq_senior_searches_senior_restricted',
          unique: true,
          fields: ['seniorId', 'isRestricted'],
        },
      ],
    });
  return SeniorSearch;
}


