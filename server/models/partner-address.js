import { DataTypes, Model } from 'sequelize';

export default function PartnerAddressModel(sequelize) {
  class PartnerAddress extends Model { }
  PartnerAddress.init({
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

  },
    {
      sequelize,
      modelName: 'partner-address',
      tableName: 'partner-addresses',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return PartnerAddress;
}
