import { DataTypes, Model } from 'sequelize';
import { ORDER_RECIPIENT_STATUS } from '../../shared/dist/constants/orders.js';

export default function OrderRecipientModel(sequelize) {
  class OrderRecipient extends Model {}

  OrderRecipient.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      seniorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      homeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      recipientStatus: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [
            [
              ORDER_RECIPIENT_STATUS.PRESENT,
              ORDER_RECIPIENT_STATUS.ABSENT,
              ORDER_RECIPIENT_STATUS.DELETED,
            ],
          ],
        },
        defaultValue: ORDER_RECIPIENT_STATUS.PRESENT,
      },
    },
    {
      sequelize,
      modelName: 'order-recipient',
      tableName: 'order-recipients',
      underscored: false,
      timestamps: true,
      updatedAt: true,
      indexes: [
        {
          unique: true,
          fields: ['orderId', 'recipientId'],
        },
      ],
    },
  );

  return OrderRecipient;
}
