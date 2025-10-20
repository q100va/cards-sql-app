import { DataTypes, Model } from 'sequelize';

export default function RolePermissionModel(sequelize) {
  class RolePermission extends Model { }
RolePermission.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    unique: false,
    allowNull: false,
    validate: {
      notEmpty: true,
    }
  },
  access:
  {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  disabled:
  {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  }
},
{
    sequelize,
    modelName: 'role-permission',
    tableName: 'role-permissions',
    timestamps: true, // createdAt
    updatedAt: true,
      indexes: [
    { name: 'role_permissions_role_id_idx', fields: ['roleId'] },
    { name: 'role_permissions_role_id_name_uk', unique: true, fields: ['roleId', 'name'] },
  ],
  });

  return RolePermission;
}


