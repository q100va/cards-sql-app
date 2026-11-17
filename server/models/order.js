import { DataTypes, Model } from 'sequelize';
import {
  ORDER_STATUS,
  ORDER_SOURCE,
} from '../../shared/dist/constants/orders.js';

export default function OrderModel(sequelize) {
  class Order extends Model { }
  Order.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      occasionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      volunteerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      instituteId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [Object.values(ORDER_STATUS)],
        },
      },
      source: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isIn: [Object.values(ORDER_SOURCE)],
        },
      },
      comment: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'order',
      tableName: 'orders',
      underscored: false,
      timestamps: true,
    }
  );
  return Order;
}
