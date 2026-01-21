import { sequelize } from "../src/config/db";
import { User } from "./user";
import { Role } from "./role";
import { Organization } from "./organization";
import { Blacklist } from "./blacklist";
import { AuditLog } from "./auditLogs";
import { Session } from "./session";

// 1. Create the model registry
const models = {
  User,
  Role,
  Organization,
  Blacklist,
  AuditLog,
  Session,
};

// 2. Execute associations using the registry
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

// 3. Export everything
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