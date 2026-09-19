import { DataTypes, Model } from 'sequelize';

export default function VolunteerOutdatedNameModel(sequelize) {
  class VolunteerOutdatedName extends Model { }

  VolunteerOutdatedName.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      patronymic: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'volunteer-outdated-name',
      tableName: 'volunteer-outdated-names',
      timestamps: true,
    },
  );

  return VolunteerOutdatedName;
}
