import { DataTypes, Model } from 'sequelize';

export default function LocalityModel(sequelize) {
  class Locality extends Model { }
  Locality.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    shortName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    isFederalCity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isCapitalOfRegion: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isCapitalOfDistrict: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    }
  },
    {
      sequelize,
      modelName: 'locality',
      tableName: 'localities',
      timestamps: true, // createdAt
      updatedAt: true,
    });


  return Locality;
}
