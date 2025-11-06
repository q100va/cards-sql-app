import { DataTypes, Model } from 'sequelize';

export default function UserAddressModel(sequelize) {
  class UserAddress extends Model { }
  UserAddress.init({
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
    }
  },
    {
      sequelize,
      modelName: 'user-address',
      tableName: 'user-addresses',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return UserAddress;
}
