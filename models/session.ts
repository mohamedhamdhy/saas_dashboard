// MODULE: User Session Management (Paranoid Mode)
// HEADER: Imports & Setup
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../src/config/db";

// HEADER: Type Definitions
// PROPS: Explicitly defining attributes to ensure full Type-Safety in Cron Jobs and Services.
interface SessionAttributes {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastActive: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null; // SECURITY: Essential for querying soft-deleted records.
}

interface SessionCreationAttributes extends Optional<SessionAttributes, "id" | "lastActive"> { }

// HEADER: Class Implementation
export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: string;
  public userId!: string;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public lastActive!: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // SECURITY: Soft-delete timestamp used for session revocation forensics.
  public readonly deletedAt!: Date | null;

  static associate(models: any) {
    this.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });
  }
}

// HEADER: Table Schema Initialization
Session.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastActive: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: "sessions",
  modelName: "session",
  timestamps: true,
  underscored: false
});