import { DataTypes, Model } from 'sequelize';

export default function PartnerOutdatedNameModel(sequelize) {
  class PartnerOutdatedName extends Model {}

  PartnerOutdatedName.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      firstName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      patronymic: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      lastName: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'partner-outdated-name',
      tableName: 'partner-outdated-names',
      timestamps: true,
    },
  );

  return PartnerOutdatedName;
}
