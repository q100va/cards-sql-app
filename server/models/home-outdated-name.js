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
      type: DataTypes.STRING,
      allowNull: false,
    },

  },
    {
      sequelize,
      modelName: 'home-outdated-name',
      tableName: 'home-outdated-names',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return HomeOutdatedName;
}


