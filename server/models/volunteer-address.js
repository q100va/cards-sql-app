import { DataTypes, Model } from 'sequelize';

export default function VolunteerAddressModel(sequelize) {
  class VolunteerAddress extends Model { }
  VolunteerAddress.init({
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
      modelName: 'volunteer-address',
      tableName: 'volunteer-addresses',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return VolunteerAddress;
}
