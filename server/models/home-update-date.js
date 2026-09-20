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
    },
    isLatest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
    {
      sequelize,
      modelName: 'home-update-date',
      tableName: 'home-update-dates',
      timestamps: true,
      indexes: [
        {
          name: 'uq_home_update_dates_latest',
          unique: true,
          fields: ['homeId'],
          where: {
            isLatest: true,
          },
        },
      ],
    });
  return HomeUpdateDate;
}


