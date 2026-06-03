// server/models/order.js
import { DataTypes, Model } from 'sequelize';

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
      institutesId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      //1 - 'PENDING' 2 - 'ACCEPTED' 3 - 'RETURNED' 4 - 'OVERDUE'
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 4,
        }
      },
      //1 - 'SUBS' 2 - 'SITE' 3 - 'VK' 4 - 'TELEGRAM' 5 - 'INSTA' 6 - 'FB' 7 - 'DOBRORU' 8 - 'INFLUENCER' 9 - 'OTHER'
      source: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 9,
        }
      },
      contactSnapshot: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        }
      },
      comment: {
        type: DataTypes.STRING,
      },
      orderRecipientsId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      }
    },
    {
      sequelize,
      modelName: 'order',
      tableName: 'orders',
      underscored: false,
      timestamps: true, // createdAt
      updatedAt: true,
/*       indexes: [
        {
          unique: true,
          fields: ['occasionId', 'seniorId'],
        },
      ] */
    }
  );
  return Order;
}
