// MODULE: Database Registry & Association Manager
// HEADER: Model Imports
import { sequelize } from "../src/config/db";
import { User } from "./user";
import { Role } from "./role";
import { Organization } from "./organization";
import { Blacklist } from "./blacklist";
import { AuditLog } from "./auditLogs";
import { Session } from "./session";

// HEADER: Model Map
// NOTE: Grouping models here allows for a single point of truth when injecting dependencies into associations.
const models = {
  User,
  Role,
  Organization,
  Blacklist,
  AuditLog,
  Session,
};

// HEADER: Association Bootstrap
// DB: Iterating through each model to establish Foreign Key relationships and joins.
// PERF: Using Object.values ensures all models are initialized before associations are mapped to prevent 'undefined' model errors.
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

// HEADER: Exports
// API: Exporting individual models for direct use and the sequelize instance for transaction management.
export {
  sequelize,
  User,
  Role,
  Organization,
  Blacklist,
  AuditLog,
  Session
};

export default models;