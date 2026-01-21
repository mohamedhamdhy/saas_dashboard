import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("auditLogs", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: true, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" },
    action: { type: DataTypes.STRING, allowNull: false },
    ipAddress: { type: DataTypes.STRING },
    userAgent: { type: DataTypes.STRING },
    metadata: { type: DataTypes.JSONB },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("auditLogs");
}