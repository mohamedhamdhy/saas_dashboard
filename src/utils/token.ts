import jwt from "jsonwebtoken";
import { User } from "../../models/index";

const ACCESS_SECRET = process.env.JWT_SECRET || "access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

export const generateTokens = (user: User) => {
  const userData = user as any;

  const accessTokenPayload = {
    id: user.id,
    role: userData.role?.name || userData.roleName || "USER",
    organizationId: userData.organizationId,
    tokenVersion: userData.tokenVersion
  };

  const refreshTokenPayload = {
    id: user.id,
    tokenVersion: userData.tokenVersion
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