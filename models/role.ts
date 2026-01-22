// MODULE: Role-Based Access Control (RBAC) System
// HEADER: Imports & Setup
import { DataTypes, Model } from "sequelize";
import { sequelize } from "../src/config/db";

// HEADER: Enumerations
// SECURITY: Strictly defined roles to prevent unauthorized privilege escalation.
// NOTE: Updated to CamelCase for consistency with frontend and TypeScript standards.
export enum RoleName {
  SuperAdmin = "superAdmin",
  Admin = "admin",
  Cashier = "cashier",
}

// HEADER: Class Implementation
export class Role extends Model {
  public id!: string;
  public name!: RoleName;

  // DB: Relationships
  // NOTE: Roles serve as the parent entity; cascading is restricted to prevent orphaned users.
  static associate(models: any) {
    Role.hasMany(models.User, { foreignKey: "roleId", as: "users" });
  }
}

// HEADER: Table Schema Initialization
// DB: Defining the 'roles' table structure.
Role.init({
  id: { 
    type: DataTypes.UUID, 
    defaultValue: DataTypes.UUIDV4, 
    primaryKey: true 
  },
  // SECURITY: ENUM values now match TypeScript CamelCase naming conventions.
  name: {
    type: DataTypes.ENUM(...Object.values(RoleName)),
    allowNull: false,
    unique: true
  },
}, {
  sequelize,
  tableName: "roles",
  // NOTE: Timestamps allow tracking of when specific authorization levels were added.
  timestamps: true,
  paranoid: true,
  underscored: false,
});