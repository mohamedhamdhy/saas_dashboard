import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

export class Organization extends Model {
  public id!: string;
  public name!: string;
  public email?: string;
  public isActive!: boolean;

  static associate(models: any) {
    Organization.hasMany(models.User, { foreignKey: "organizationId", as: "users" });
  }
}

Organization.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize,
  tableName: "organizations",
  timestamps: true,
  paranoid: true,
});