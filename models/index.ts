import { sequelize } from "../src/config/db";
import { User } from "./user";
import { Role } from "./role";
import { Organization } from "./organization";
import { Blacklist } from "./blacklist";
import { AuditLog } from "./auditLog";

const models = {
  User,
  Role,
  Organization,
  Blacklist,
  AuditLog,
};

Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export {
  sequelize,
  User,
  Role,
  Organization,
  Blacklist,
  AuditLog
};

export default models;