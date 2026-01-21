import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../src/config/db";

interface BlacklistAttributes {
  id: string;
  token: string;
  expiresAt: Date;
}

// id is optional during creation because defaultValue handles it
interface BlacklistCreationAttributes extends Optional<BlacklistAttributes, "id"> {}

export class Blacklist extends Model<BlacklistAttributes, BlacklistCreationAttributes> {
  public id!: string; 
  public token!: string;
  public expiresAt!: Date;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Blacklist.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  modelName: "blacklist",
  tableName: "blacklists",
  timestamps: true,
  underscored: false 
});