import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

export enum RoleName {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
}

export class Role extends Model {
  public id!: string;
  public name!: RoleName;

  static associate(models: any) {
    Role.hasMany(models.User, { foreignKey: "roleId", as: "users" });
  }
}

Role.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: {
    type: DataTypes.ENUM(...Object.values(RoleName)),
    allowNull: false,
    unique: true
  },
}, {
  sequelize,
  tableName: "roles",
  timestamps: true,
  underscored: false,
});