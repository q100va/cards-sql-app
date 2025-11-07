import { DataTypes, Model } from 'sequelize';

export default function PartnerOutdatedNameModel(sequelize) {
  class PartnerOutdatedName extends Model { }
  PartnerOutdatedName.init({
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
      modelName: 'partner-outdated-name',
      tableName: 'partner-outdated-names',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return PartnerOutdatedName;
}


