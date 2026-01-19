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

  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  await queryInterface.bulkInsert("users", [{
    id: userId,
    name: "Super Admin",
    email: "superadmin@gmail.com",
    password: hashedPassword,
    roleId: roles[0].id,
    organizationId: orgId,
    phoneNumber: "1234567890",
    isActive: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  await queryInterface.bulkInsert("sessions", [
    {
      id: uuidv4(),
      userId: userId,
      ipAddress: "192.168.1.1",
      userAgent: "Chrome / Windows 11 (Current)",
      lastActive: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: uuidv4(),
      userId: userId,
      ipAddress: "172.20.10.4",
      userAgent: "Safari / iPhone 15",
      lastActive: new Date(Date.now() - 3600000),
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000)
    }
  ]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete("sessions", {});
  await queryInterface.bulkDelete("users", {});
  await queryInterface.bulkDelete("organizations", {});
  await queryInterface.bulkDelete("roles", {});
}