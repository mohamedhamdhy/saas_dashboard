// MODULE: Token Revocation Service (Blacklist)
// SECURITY: Prevents compromised or logged-out JWTs from accessing protected routes.

// HEADER: Imports & Setup
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../src/config/db";

// HEADER: Type Definitions
// PROPS: Attributes for tracking revoked authentication tokens.
interface BlacklistAttributes {
  id: string;
  token: string;
  expiresAt: Date;
}

// PROPS: Optional fields for model instantiation.
interface BlacklistCreationAttributes extends Optional<BlacklistAttributes, "id"> {}

// HEADER: Class Implementation
export class Blacklist extends Model<BlacklistAttributes, BlacklistCreationAttributes> {
  public id!: string; 
  public token!: string;
  public expiresAt!: Date;

  // DB: Audit timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// HEADER: Table Schema Initialization
// DB: Defining the 'blacklists' table structure.
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