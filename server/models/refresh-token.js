import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.js';

class RefreshToken extends Model {}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true,
    },
    userAgent: { type: DataTypes.STRING, allowNull: true },
    ip: { type: DataTypes.STRING, allowNull: true },

    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    rotatedAt: { type: DataTypes.DATE, allowNull: true },
    replacedByTokenId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    modelName: 'refresh_token',
    timestamps: true,
    indexes: [{ fields: ['userId'] }],
  }
);

export default RefreshToken;
