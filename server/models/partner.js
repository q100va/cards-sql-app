import { DataTypes, Model } from 'sequelize';
import { PARTNER_AFFILIATION } from '../../shared/dist/constants/partners.js';

export default function PartnerModel(sequelize) {
  class Partner extends Model { }
  Partner.init(
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
      affiliation: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [Object.values(PARTNER_AFFILIATION)],
        },
      },
      position: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dateOfStart: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      isRestricted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      causeOfRestriction: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dateOfRestriction: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'partner',
      tableName: 'partners',
      underscored: false,
      timestamps: true,
    }
  );
  return Partner;
}
