// MODULE: Initial Database Seeder & Bootstrap Logic
// Populates the database with essential core data required for system startup.

// HEADER: Imports & Setup
import { QueryInterface } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// HEADER: Migration UP (Seed Execution)
export async function up(queryInterface: QueryInterface) {

  // SECURITY: Defining the root access levels for the RBAC system.
  // NOTE: Roles updated to CamelCase to match the Role model Enum definitions.
  const roles = [
    { id: uuidv4(), name: "superAdmin", createdAt: new Date(), updatedAt: new Date() },
    { id: uuidv4(), name: "admin", createdAt: new Date(), updatedAt: new Date() },
    { id: uuidv4(), name: "cashier", createdAt: new Date(), updatedAt: new Date() },
  ];
  await queryInterface.bulkInsert("roles", roles);

  // DB: Creating the Root Organization.
  // NOTE: This acts as the primary tenant for multi-tenancy testing and initial setup.
  const orgId = uuidv4();
  await queryInterface.bulkInsert("organizations", [{
    id: orgId,
    name: "HMD Pvt. Ltd",
    email: "hmd@gmail.com",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  // SECURITY: Generating credentials for the initial System Administrator.
  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  // DB: Establishing the first User with Root privileges.
  await queryInterface.bulkInsert("users", [{
    id: userId,
    name: "Mohamed Al Hamdhy",
    email: "mohamedalhamdhy@gmail.com",
    password: hashedPassword,
    roleId: roles[0].id, 
    organizationId: orgId,
    phoneNumber: "971547267857",
    isActive: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  // STATE: Simulating active session history for the Super Admin.
  // NOTE: Providing multiple session entries helps test 'Logout from all devices' logic.
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

// HEADER: Migration DOWN (Seed Rollback)
// FIX: Sequence is crucial here; we delete child records first to avoid Foreign Key constraint errors.
export async function down(queryInterface: QueryInterface) {
  await queryInterface.bulkDelete("sessions", {});
  await queryInterface.bulkDelete("users", {});
  await queryInterface.bulkDelete("organizations", {});
  await queryInterface.bulkDelete("roles", {});
}