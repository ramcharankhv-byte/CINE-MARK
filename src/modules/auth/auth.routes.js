import { Router } from "express";

import {
  googleSignup,
  googleLogin,
  refreshCookies,
  logout,
} from "../controllers/auth/auth.controller.js";

import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/google/signup", googleSignup);

router.post("/google/login", googleLogin);

router.post("/refresh", refreshCookies);

router.post("/logout", verifyJwt, logout);

export default router;
