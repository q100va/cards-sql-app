import { DataTypes, Model } from 'sequelize';

export default function RegionModel(sequelize) {
  class Region extends Model { }
  Region.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    shortName: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    isAvailableForClients: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    }
  },
    {
      sequelize,
      modelName: 'region',
      tableName: 'regions',
      timestamps: true, // createdAt
      updatedAt: true,
    });


  return Region;
}
