import { DataTypes, Model } from 'sequelize';

export default function RoleModel(sequelize) {
  class Role extends Model {}

  Role.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [2, 50],
        },
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 500],
        },
      },
    },
    {
      sequelize,
      modelName: 'role',
      tableName: 'roles',
      underscored: false,
      timestamps: true,
    },
  );

  return Role;
}
