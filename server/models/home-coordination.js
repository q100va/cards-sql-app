import { DataTypes, Model } from 'sequelize';

export default function HomeCoordinationModel(sequelize) {
  class HomeCoordination extends Model { }
  HomeCoordination.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isRecoverable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
    {
      sequelize,
      modelName: 'home-coordination',
      tableName: 'home-coordinations',
      timestamps: true,
    });

  return HomeCoordination;
}
