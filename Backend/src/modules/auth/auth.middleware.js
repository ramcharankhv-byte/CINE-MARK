import { createClient } from "@supabase/supabase-js";

import { prisma } from "../../config/db.js";
import { logger } from "../../config/logger.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import { ApiError } from "../../utils/api-error.js";

/**
 * Lazily created Supabase client.
 *
 * Built on first use rather than at import time so that a missing environment
 * variable surfaces as a clear 500 from this module instead of crashing the
 * whole process while Express is still wiring up its routers.
 */
let supabaseClient = null;

const getSupabase = () => {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new ApiError(
      500,
      "Supabase is not configured: SUPABASE_URL and SUPABASE_ANON_KEY are required",
    );
  }

  supabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabaseClient;
};

/**
 * Derives a display name for a Supabase user.
 *
 * `User.name` is NOT NULL in the database, but Google does not always return a
 * name and email/OTP signups never do, so this always resolves to a string.
 */
const resolveDisplayName = (authUser) => {
  const meta = authUser.user_metadata ?? {};

  return (
    meta.full_name ||
    meta.name ||
    authUser.email?.split("@")[0] ||
    "User"
  );
};

/**
 * Provisions the authenticated Supabase user into the application database.
 *
 * Supabase owns identity; this database owns watchlists. Nothing else in the
 * system creates User rows, so the first authenticated request a user makes is
 * what materialises them here. `id` is always the Supabase UUID, never
 * database-generated, because every Watchlist.userId foreign key references it.
 */
const provisionUser = async (authUser) => {
  const profile = {
    email: authUser.email,
    name: resolveDisplayName(authUser),
    picture:
      authUser.user_metadata?.avatar_url ??
      authUser.user_metadata?.picture ??
      null,
  };

  try {
    return await prisma.user.upsert({
      where: { id: authUser.id },
      create: { id: authUser.id, ...profile },
      update: { email: profile.email, picture: profile.picture },
      select: { id: true, email: true, name: true, picture: true },
    });
  } catch (error) {
    // P2002 on User_email_key means a legacy row already holds this email under
    // a different (pre-Supabase) id. Fall back to that row rather than failing
    // the request; the account is the same person.
    const isEmailConflict =
      error?.code === "P2002" &&
      (error?.meta?.target ?? []).includes?.("email");

    if (!isEmailConflict) throw error;

    logger.warn(
      { email: profile.email, supabaseId: authUser.id },
      "Email already registered under a different id; using the existing row",
    );

    const existing = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, email: true, name: true, picture: true },
    });

    if (!existing) throw error;

    return existing;
  }
};

export const verifyJwt = asyncHandler(async (req, res, next) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  const supabase = getSupabase();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !authUser) {
    throw new ApiError(401, "Invalid or expired Supabase token");
  }

  if (!authUser.email) {
    throw new ApiError(401, "Supabase account has no email address");
  }

  req.user = await provisionUser(authUser);

  next();
});
