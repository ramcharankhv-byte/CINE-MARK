import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { ApiError } from "../../utils/api-error.js";

export const getMe = asyncHandler(async (req, res) => {
  // req.user attached by verifyJwt middleware
  return res.json(new ApiResponse(200, req.user, "User fetched"));
});
