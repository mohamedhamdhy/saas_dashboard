import jwt from "jsonwebtoken";
import { User } from "../../models/index";

const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

export const generateTokens = (user: User) => {
  const accessTokenPayload = {
    id: user.id,
    roleName: user.role?.name || user.roleName,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion
  };

  const refreshTokenPayload = {
    id: user.id,
    tokenVersion: user.tokenVersion
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};