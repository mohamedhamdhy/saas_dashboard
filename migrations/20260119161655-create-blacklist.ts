import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("blacklists", {
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
    },
    createdAt: { 
      type: DataTypes.DATE, 
      allowNull: false 
    },
    updatedAt: { 
      type: DataTypes.DATE, 
      allowNull: false 
    },
  });

  await queryInterface.addIndex("blacklists", ["token"]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("blacklists");
}