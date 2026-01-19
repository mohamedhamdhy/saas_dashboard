import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../src/config/db";
import { Role } from "./role";
import { Organization } from "./organization";
import bcrypt from "bcryptjs";

interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password?: string;
  roleId: string;
  organizationId?: string | null;
  phoneNumber?: string;
  isActive?: boolean;
  passwordChangedAt?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  refreshToken?: string | null;
  mfaSecret?: string | null;
  isMfaEnabled?: boolean;
  mfaRecoveryCodes?: string[] | null;
}

interface UserCreationAttributes extends Optional<UserAttributes,
  "id" | "organizationId" | "phoneNumber" | "isActive" | "passwordChangedAt" | "passwordResetToken" | "passwordResetExpires" | "refreshToken" | "mfaSecret" | "isMfaEnabled" | "mfaRecoveryCodes"
> { }

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public roleId!: string;
  public organizationId?: string | null;
  public phoneNumber?: string;
  public isActive?: boolean;
  public passwordChangedAt?: Date | null;
  public passwordResetToken?: string | null;
  public passwordResetExpires?: Date | null;
  public refreshToken?: string | null;
  public mfaSecret?: string | null;
  public isMfaEnabled?: boolean;
  public mfaRecoveryCodes?: string[] | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
  public readonly role?: Role;
  public readonly organization?: Organization;

  public get roleName(): string | undefined {
    return this.role?.name;
  }

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  static associate(models: any) {
    User.belongsTo(models.Role, { foreignKey: "roleId", as: "role" });
    User.belongsTo(models.Organization, { foreignKey: "organizationId", as: "organization" });
    User.hasMany(models.AuditLog, { foreignKey: "userId", as: "auditLogs" });
  }

  toJSON() {
    const values: any = { ...this.get() };

    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    delete values.refreshToken;
    delete values.mfaSecret;
    delete values.mfaRecoveryCodes;

    values.roleName = this.role?.name || null;
    values.organizationName = this.organization?.name || null;

    return values;
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [2, 50] }
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mfaSecret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isMfaEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  mfaRecoveryCodes: {
    type: DataTypes.JSONB,
    allowNull: true,
  }
}, {
  sequelize,
  tableName: "users",
  timestamps: true,
  paranoid: true,
  indexes: [
    { unique: true, fields: ["email"] },
    { fields: ["roleId"] },
    { fields: ["organizationId"] }
  ]
});