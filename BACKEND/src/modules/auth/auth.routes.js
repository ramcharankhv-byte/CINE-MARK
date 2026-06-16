import { Router } from "express";
import { getMe } from "./auth.controller.js";
import { verifyJwt } from "./auth.middleware.js";

const authRouter = Router();

authRouter.get("/me", verifyJwt, getMe);

export default authRouter;
