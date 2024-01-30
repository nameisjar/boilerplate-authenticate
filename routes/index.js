const { Router } = require("express");
const auth = require("./auth");

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: true,
    message: "Hello from API!",
  });
});

router.use("/auth", auth);

module.exports = router;
