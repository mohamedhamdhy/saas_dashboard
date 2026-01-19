import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

export class AuditLog extends Model {
  public id!: string;
  public userId!: string | null;
  public action!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public metadata!: any;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static associate(models: any) {
    AuditLog.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  }
}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING
  },
  userAgent: {
    type: DataTypes.STRING
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  sequelize,
  modelName: "AuditLog",
  tableName: "audit_logs",
  timestamps: true
});