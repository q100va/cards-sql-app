import { DataTypes, Model } from 'sequelize';

export default function SeniorOutdatedNameModel(sequelize) {
  class SeniorOutdatedName extends Model { }
  SeniorOutdatedName.init({
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
      modelName: 'senior-outdated-name',
      tableName: 'senior-outdated-names',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return SeniorOutdatedName;
}


