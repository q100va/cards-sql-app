import { DataTypes, Model } from 'sequelize';

export default function HomeOutdatedNameModel(sequelize) {
  class HomeOutdatedName extends Model { }
  HomeOutdatedName.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    officialName: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
    {
      sequelize,
      modelName: 'home-outdated-name',
      tableName: 'home-outdated-names',
      timestamps: true,
    });
  return HomeOutdatedName;
}


