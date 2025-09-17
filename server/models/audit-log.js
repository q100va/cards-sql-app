import { DataTypes, Model } from 'sequelize';

export default function AuditLogModel(sequelize) {
  class AuditLog extends Model { }

  AuditLog.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    action: { type: DataTypes.ENUM('create', 'update', 'delete', 'auth'), allowNull: false },
    model: { type: DataTypes.STRING(64), allowNull: false },
    entityId: { type: DataTypes.STRING(64), allowNull: false },
    diff: { type: DataTypes.JSONB, allowNull: true }, // { changed: { field: [before, after] } }
    actorUserId: { type: DataTypes.INTEGER, allowNull: true },
    correlationId: { type: DataTypes.STRING(128), allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'audit_log',
    tableName: 'audit_logs',
    timestamps: true, // createdAt
    updatedAt: false,
    indexes: [
      {
        name: 'audit_logs_model_entity_created_user_idx',
        fields: ['model', 'entityId', 'createdAt', 'actorUserId'],
      },
      {
        name: 'audit_logs_correlation_idx',
        fields: ['correlationId'],
      },
      { name: 'audit_logs_created_at_idx', fields: ['createdAt'] },
    ],
  });

  return AuditLog;
}
