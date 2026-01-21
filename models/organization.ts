import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../src/config/db";

interface OrganizationAttributes {
  id: string;
  name: string;
  email?: string | null;
  isActive: boolean;
}

interface OrganizationCreationAttributes extends Optional<OrganizationAttributes, "id" | "isActive" | "email"> {}

export class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public id!: string;
  public name!: string;
  public email!: string | null;
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static associate(models: any) {
    // One Organization has many Users
    this.hasMany(models.User, {
      foreignKey: "organizationId",
      as: "users"
    });
  }
}

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
  timestamps: true,
  underscored: false
});