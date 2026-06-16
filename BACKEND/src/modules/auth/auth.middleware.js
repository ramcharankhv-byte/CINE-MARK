import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import { ApiError } from "../../utils/api-error.js";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const verifyJwt = asyncHandler(async (req, res, next) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  try {
    // Call Supabase API to securely verify the token (this works for ECC / Asymmetric keys automatically)
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !authUser) {
      throw new ApiError(401, "Invalid or expired Supabase token");
    }
    
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "Invalid Token: User not found in database");
    }

    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, err.message || "Invalid or expired Supabase token");
  }
});
