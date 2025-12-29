import { DataTypes, Model } from 'sequelize';

export default function VolunteerSubscriptionModel(sequelize) {
  class VolunteerSubscription extends Model { }
  VolunteerSubscription.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    }
  },
    {
      sequelize,
      modelName: 'volunteer-subscription',
      tableName: 'volunteer-subscriptions',
      timestamps: true, // createdAt
      updatedAt: true,
    });

  return VolunteerSubscription;
}
