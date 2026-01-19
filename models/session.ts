import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

export class Session extends Model {
  public id!: string;
  public userId!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public lastActive!: Date;
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
  timestamps: true
});