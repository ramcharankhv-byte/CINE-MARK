import { prisma } from "../../config/db.js";
import { OAuth2Client } from "google-auth-library";
import { asyncHandler } from "../../utils/asynchandler.js";

import { ApiError } from "../../utils/api-error.js";

import { ApiResponse } from "../../utils/api-response.js";

import jwt from "jsonwebtoken";

import { generateAuthTokens, verifyGoogleToken } from "./auth.services.js";

/**
 * @desc    Google Signup - Registers a new user
 * @route   POST /api/v1/auth/google/signup
 * @access  Public
 */
export const googleSignup = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Google ID Token is required");
  }

  const payload = await verifyGoogleToken(idToken);
  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    throw new ApiError(400, "Email permission is required from Google account");
  }

  // Check if user already exists in PostgreSQL
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ googleId }, { email }],
    },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists. Please login instead.");
  }

  // Create new user in PostgreSQL
  const newUser = await prisma.user.create({
    data: {
      googleId,
      email,
      name: name || "Google User",
      picture: picture || null,
    },
  });

  // Generate tokens
  const { accessToken, refreshToken } = generateAuthTokens(
    newUser.id,
    newUser.email,
  );

  const userResponse = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    picture: newUser.picture,
  };

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: userResponse, accessToken, refreshToken },
        "User registered successfully with Google",
      ),
    );
});

/**
 * @desc    Google Login - Authenticates an existing user
 * @route   POST /api/v1/auth/google/login
 * @access  Public
 */
export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, "Google ID Token is required");
  }

  const payload = await verifyGoogleToken(idToken);
  const { sub: googleId } = payload;

  // Find user by their unique googleId
  const user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) {
    throw new ApiError(404, "Account does not exist. Please sign up first.");
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateAuthTokens(user.id, user.email);

  // Sync profile picture or name modifications if they changed on Google side
  const updatedUser = await prisma.user.update({
    where: { googleId },
    data: {
      name: payload.name || user.name,
      picture: payload.picture || user.picture,
      refreshToken,
    },
  });

  const userResponse = {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    picture: updatedUser.picture,
  };

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: userResponse },
        "Logged in successfully with Google",
      ),
    );
});

export const refreshCookies = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: Missing refresh token");
  }

  // 2. Verify the token using your secret key
  let decodedToken;
  try {
    decodedToken = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  // 3. Find the user in PostgreSQL and verify the stored token matches
  const user = await prisma.user.findUnique({
    where: { id: decodedToken.id },
  });

  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  // Ensure the token hasn't been reused or invalidated (Prevents replay attacks)
  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or already used");
  }

  // Generate tokens
  const { accessToken, refreshToken: newRefreshToken } = generateAuthTokens(
    user.id,
    user.email,
  );

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken: newRefreshToken,
    },
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "lax",
  };

  const userResponse = {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    picture: updatedUser.picture,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 })
    .cookie("refreshToken", newRefreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, { user: userResponse }, "cookies Refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    throw new ApiError(400, "User ID is required to log out safely");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(404, "Account does not exist. Please sign up first.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: null,
    },
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});
