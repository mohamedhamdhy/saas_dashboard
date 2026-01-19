import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("users", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.UUID, allowNull: false, references: { model: "roles", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
    organizationId: { type: DataTypes.UUID, allowNull: true, references: { model: "organizations", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
    phoneNumber: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
    passwordResetToken: { type: DataTypes.STRING, allowNull: true },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true },
    refreshToken: { type: DataTypes.TEXT, allowNull: true },
    mfaSecret: { type: DataTypes.STRING, allowNull: true },
    isMfaEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    mfaRecoveryCodes: { type: DataTypes.JSONB, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("users");
}