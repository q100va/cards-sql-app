import { DataTypes, Model } from 'sequelize';

export default function VolunteerSearchModel(sequelize) {
  class VolunteerSearch extends Model { }

  VolunteerSearch.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
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
      modelName: 'volunteer-search',
      tableName: 'volunteer-searches',
      timestamps: true,

      indexes: [
        {
          name: 'uq_volunteer_searches_volunteer_restricted',
          unique: true,
          fields: ['volunteerId', 'isRestricted'],
        },
      ],
    },
  );

  return VolunteerSearch;
}
