import { lazy } from "react";

export const LoginPage = lazy(() => import("./login.page"));
export const RegisterPage = lazy(() => import("./register.page"));
export const ForgetPasswordPage = lazy(() => import("./forget-password.page"));
