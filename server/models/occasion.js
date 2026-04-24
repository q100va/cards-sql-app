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
      /*  name: {
         type: DataTypes.STRING,
         allowNull: false,
         validate: {
           notEmpty: true,
         }
       },
       date: {
         type: DataTypes.STRING,
         allowNull: true,
       }, */
      month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 12,
        },
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 2022
        },
      },
      type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 6,
        }
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
      },
  /*     isDeletable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }, */

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
