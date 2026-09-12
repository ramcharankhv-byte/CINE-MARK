import { asyncHandler } from "../../utils/asynchandler.js";
import { ApiResponse } from "../../utils/api-response.js";

/**
 * Returns the authenticated user.
 *
 * `req.user` is attached by verifyJwt, which also provisions the Supabase user
 * into this database on their first authenticated request. Hitting this route
 * is therefore the cheapest way to confirm that provisioning works.
 */
export const getMe = asyncHandler(async (req, res) => {
  return res.json(new ApiResponse(200, req.user, "User fetched"));
});
