import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

export class Session extends Model {
  public id!: string;
  public userId!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public lastActive!: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static associate(models: any) {
    // Defines the relationship back to the User
    this.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user"
    });
  }
}

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
  modelName: "session", // Added modelName for clarity in registry
  timestamps: true,
  underscored: false // <--- CRITICAL: Ensures Sequelize uses userId and lastActive exactly as written
});