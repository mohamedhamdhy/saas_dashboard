// MODULE: Organization & Multi-Tenancy Management
// HEADER: Imports & Setup
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../src/config/db";

// HEADER: Type Definitions
// PROPS: Core structure for the Organization entity.
interface OrganizationAttributes {
  id: string;
  name: string;
  email?: string | null;
  isActive: boolean;
}

// PROPS: Optional fields during the .create() phase.
interface OrganizationCreationAttributes extends Optional<OrganizationAttributes, "id" | "isActive" | "email"> {}

// HEADER: Class Implementation
export class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public id!: string;
  public name!: string;
  public email!: string | null;
  public isActive!: boolean;

  // DB: Audit timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // SECURITY: Soft-delete tracker.
  // NOTE: Essential for Multi-tenancy to prevent permanent loss of child data (Users/Sessions).
  public readonly deletedAt!: Date | null;

  // DB: Relationships
  // NOTE: One Organization contains many Users. 
  static associate(models: any) {
    this.hasMany(models.User, {
      foreignKey: "organizationId",
      as: "users"
    });
  }
}

// HEADER: Table Schema Initialization
// DB: Defining the 'organizations' table structure.
Organization.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { isEmail: true }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: "organizations",
  modelName: "organization",
  timestamps: true,
  paranoid: true, 
  underscored: false
});