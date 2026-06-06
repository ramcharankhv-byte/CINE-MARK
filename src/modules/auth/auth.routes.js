import { Router } from "express";

import {
  googleSignup,
  googleLogin,
  refreshCookies,
  logout,
} from "../auth/auth.controller.js";

import { verifyJwt } from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/google/signup", googleSignup);

authRouter.post("/google/login", googleLogin);

authRouter.post("/refresh", refreshCookies);

authRouter.post("/logout", verifyJwt, logout);

export default authRouter;
