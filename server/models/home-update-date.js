import { DataTypes, Model } from 'sequelize';

export default function HomeUpdateDateModel(sequelize) {
  class HomeUpdateDate extends Model { }
  HomeUpdateDate.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }

  },
    {
      sequelize,
      modelName: 'home-update-date',
      tableName: 'home-update-dates',
      timestamps: true, // createdAt
      updatedAt: true,
    });
  return HomeUpdateDate;
}


