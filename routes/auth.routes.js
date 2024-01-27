const { Router } = require("express");
const {
  register,
  login,
  authenticated,
  resetPassword,
  forgotPassword,
  verifyUser,
  googleOauth2,
} = require("../controllers/auth.controller");
const { authorizationHeader, authorizationQuery } = require("../middlewares/auth");

const auth = Router();

auth.post("/register", register);
auth.post("/login", login);
auth.get("/authenticated", authorizationHeader, authenticated);
auth.get("/verify", authorizationQuery, verifyUser);
auth.post("/forgot-password", forgotPassword);
auth.post("/reset-password", authorizationQuery, resetPassword);
auth.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
auth.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/api/v1/auth/google',
        session: false
    }),
    googleOauth2
);
module.exports = auth;
