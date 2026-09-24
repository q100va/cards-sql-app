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
  type: DataTypes.STRING(50),
  allowNull: false,
  validate: {
    notEmpty: true,
  },
},
patronymic: {
  type: DataTypes.STRING(50),
  allowNull: true,
},
lastName: {
  type: DataTypes.STRING(50),
  allowNull: true,
},
  },
    {
      sequelize,
      modelName: 'senior-outdated-name',
      tableName: 'senior-outdated-names',
      timestamps: true,
    });
  return SeniorOutdatedName;
}


