import { prisma } from "../../config/db.js";

import asyncHandler from "../../utils/asynchandler.js";

import ApiError from "../../utils/api-error.js";

import ApiResponse from "../../utils/api-response.js";

import jwt from "jsonwebtoken";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, " Unauthorized");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: {
        id: decodedToken?.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        googleId: true,
        // Includes the related watchlists array
        // watchlist refreshToken and createdAt are automatically excluded here
      },
    });
    if (!user) {
      throw new ApiError(400, "Invalid Token : Unauthorized");
    }

    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(400, "Invalid Token");
  }
});
