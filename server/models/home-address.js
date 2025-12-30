import { DataTypes, Model } from 'sequelize';

export default function HomeAddressModel(sequelize) {
  class HomeAddress extends Model { }
  HomeAddress.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    isRestricted:
    {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isRecoverable:
    {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    postalCode:
    {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    postalAddressPart:
    {
      type: DataTypes.STRING,
      allowNull: true,
    }
  },
    {
      sequelize,
      modelName: 'home-address',
      tableName: 'home-addresses',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return HomeAddress;
}
