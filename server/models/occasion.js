// server/models/occasion.js
import { DataTypes, Model } from 'sequelize';

export default function OccasionModel(sequelize) {
  class Occasion extends Model { }
  Occasion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      date: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      month: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      year: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      isDeletable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },

    },
    {
      sequelize,
      modelName: 'occasion',
      tableName: 'occasions',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Occasion;
}
