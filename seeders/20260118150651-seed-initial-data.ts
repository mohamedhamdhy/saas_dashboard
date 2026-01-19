import { QueryInterface } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function up(queryInterface: QueryInterface) {

  const roles = [
    { id: uuidv4(), name: "SUPER_ADMIN", createdAt: new Date(), updatedAt: new Date() },
    { id: uuidv4(), name: "ADMIN", createdAt: new Date(), updatedAt: new Date() },
    { id: uuidv4(), name: "CASHIER", createdAt: new Date(), updatedAt: new Date() },
  ];
  await queryInterface.bulkInsert("roles", roles);

  const orgId = uuidv4();
  await queryInterface.bulkInsert("organizations", [{
    id: orgId,
    name: "HMD Pvt. Ltd",
    email: "hmd@gmail.com",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  await queryInterface.bulkInsert("users", [{
    id: uuidv4(),
    name: "Super Admin",
    email: "superadmin@gmail.com",
    password: hashedPassword,
    roleId: roles[0].id,
    organizationId: orgId,
    phoneNumber: "1234567890",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete("users", {});
  await queryInterface.bulkDelete("organizations", {});
  await queryInterface.bulkDelete("roles", {});
}