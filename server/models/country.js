import { DataTypes, Model } from 'sequelize';

export default function CountryModel(sequelize) {
  class Country extends Model { }
  Country.init({
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
    isRestricted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    }
  },
    {
      sequelize,
      modelName: 'country',
      tableName: 'countries',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return Country;
}
