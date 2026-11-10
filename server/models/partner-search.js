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
    isRestricted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
    {
      sequelize,
      modelName: 'partner-search',
      tableName: 'partner-searches',
      timestamps: true,
      indexes: [
        {
          name: 'uq_partner_searches_partner_restricted',
          unique: true,
          fields: ['partnerId', 'isRestricted'],
        },
      ],
    });
  return PartnerSearch;
}


