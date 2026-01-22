// MODULE: System Audit Logging & Forensics
// HEADER: Imports & Setup
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

// HEADER: Class Implementation
export class AuditLog extends Model {
  public id!: string;
  public userId!: string | null;
  public action!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public metadata!: any;

  // DB: Audit logs are immutable; createdAt is the primary dimension for log analysis.
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // DB: Relationships
  // NOTE: userId is nullable to track actions taken by unauthenticated users (e.g., failed logins).
  static associate(models: any) {
    this.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });
  }
}

// HEADER: Table Schema Initialization
// DB: Defining the 'auditLogs' table structure.
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
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  sequelize,
  modelName: "auditLog",
  tableName: "auditLogs",
  timestamps: true,
  paranoid: true,
  underscored: false,
  freezeTableName: true,
});