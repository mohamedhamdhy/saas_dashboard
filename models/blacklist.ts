import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

export class Blacklist extends Model {
  public id!: number;
  public token!: string;
  public expiresAt!: Date;
}

Blacklist.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
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
  timestamps: true,
  underscored: true
});