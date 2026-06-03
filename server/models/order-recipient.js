// server/models/order-recipients.js
import { DataTypes, Model } from 'sequelize';

export default function OrderRecipientModel(sequelize) {
  class OrderRecipient extends Model { }
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
      //1 - 'PRESENT' 2 - 'ABSENT' 3 - 'DELETED'
      recipientStatus: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 3,
        },
        defaultValue: 1
      },
      //1 - 'DRAFT' 2 - 'COMPLETED'
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 2,
        },
        defaultValue: 1
      },
    },
    {
      sequelize,
      modelName: 'order-recipient',
      tableName: 'order-recipients',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
      indexes: [
        {
          unique: true,
          fields: ['orderId', 'recipientId'],
        },
      ]
    }
  );
  return OrderRecipient;
}
