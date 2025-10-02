import { DataTypes, Model } from 'sequelize';

export default function DistrictModel(sequelize) {
  class District extends Model { }
  District.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    shortName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    postName: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    shortPostName: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    }
  },
    {
      sequelize,
      modelName: 'district',
      tableName: 'districts',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return District;
}
