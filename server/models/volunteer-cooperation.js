import { DataTypes, Model } from 'sequelize';

export default function VolunteerCooperationModel(sequelize) {
  class VolunteerCooperation extends Model { }
  VolunteerCooperation.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },

  },
    {
      sequelize,
      modelName: 'volunteer-cooperation',
      tableName: 'volunteer-cooperations',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return VolunteerCooperation;
}
