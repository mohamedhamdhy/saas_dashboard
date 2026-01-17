import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

/**
 * 1. Role Enum
 * We use an Enum to restrict the "role" column to specific strings.
 * This prevents typos like "Cahshier" from being saved in the database.
 */
export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
}

/**
 * 2. User Class Definition
 * We extend the Sequelize 'Model' class. 
 * The '!' (Non-null assertion) tells TypeScript that Sequelize will 
 * handle the initialization of these values.
 */
export class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: Role;

  // These are automatically managed by Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * 3. Model Initialization
 * This defines the schema (the structure) of the 'users' table in PostgreSQL.
 */
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true, // Automatically increases (1, 2, 3...)
      primaryKey: true,    // The unique identifier for each user
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true // Prevents two users from having the same email
    },
    password: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    role: {
      /**
       * Object.values(Role) converts our Enum into an array: 
       * ["SUPER_ADMIN", "ADMIN", "CASHIER"]
       */
      type: DataTypes.ENUM(...Object.values(Role)),
      defaultValue: Role.CASHIER, // New users are Cashiers by default
    },
  },
  {
    sequelize,         // Passing the connection instance we created earlier
    tableName: "users", // Explicitly naming the table in PostgreSQL
  }
);