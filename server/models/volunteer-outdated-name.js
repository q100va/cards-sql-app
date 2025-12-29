import { DataTypes, Model } from 'sequelize';

export default function VolunteerOutdatedNameModel(sequelize) {
  class VolunteerOutdatedName extends Model { }
  VolunteerOutdatedName.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    patronymic: {
      type: DataTypes.STRING
    },
    lastName: {
      type: DataTypes.STRING,
    },
  },
    {
      sequelize,
      modelName: 'volunteer-outdated-name',
      tableName: 'volunteer-outdated-names',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return VolunteerOutdatedName;
}


