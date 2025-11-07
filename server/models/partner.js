// server/models/partner.js
import { DataTypes, Model } from 'sequelize';

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
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      patronymic: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      affiliation: {
        type: DataTypes.ENUM(
          'PARTNER.AFF.VOLUNTEER_COORDINATOR',
          'PARTNER.AFF.HOME_REPRESENTATIVE',
          'PARTNER.AFF.FOUNDATION_STAFF'),
        allowNull: false,
      },
      position: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      comment: {
        type: DataTypes.TEXT
      },
      dateOfStart: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      isRestricted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      causeOfRestriction: {
        type: DataTypes.TEXT
      },
      dateOfRestriction: {
        type: DataTypes.DATE
      },

    },
    {
      sequelize,
      modelName: 'Partner',
      tableName: 'partners',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
    }
  );
  return Partner;
}
