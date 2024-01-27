const prisma = require("../libs/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { VSResetPassword, VSRegister, VSLogin } = require("../libs/validation/auth");
const { sendEmail } = require("../utils/nodemailer");
const { emailTemplate } = require("../utils/email");
const { queryUserByEmail, queryUserAdminId } = require("../utils/helpers/user");
const { createUser } = require("../services/auth");
const { JWT_SECRET } = process.env;

// Register User
const register = async (req, res, next) => {
  try {
    const { name, email, password, confirm_password, phone_number } = req.body;

    VSRegister.parse(req.body);

    if (password !== confirm_password) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        error: "Password dan Konfirmasi Password harus sama",
      });
    }

    const existingUser = await queryUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        error: "Email atau password tidak valid",
      });
    }

    const decryptedPassword = await bcrypt.hash(password, 10);

    const user = await createUser(name, email, decryptedPassword, phone_number);

    const token = jwt.sign(
      {
        id: user.id,
      },
      JWT_SECRET,
    );

    const path = `${req.protocol}://${req.get("host")}/api/auth/verify?token=${token}`;

    const template = emailTemplate(
      path,
      "Verifikasi Akun",
      "Klik tombol di bawah untuk mengaktifkan akun kamu!",
    );

    sendEmail(email, "Verifikasi Akun", template);

    res.status(200).json({
      status: true,
      message: "Registrasi berhasil, silakan cek email untuk verifikasi akun!",
    });
  } catch (error) {
    next(error);
  }
};

// Login User / Admin
const login = async (req, res, next) => {
  try {
    const { email, password, admin_id } = req.body;

    VSLogin.parse(req.body);

    const user = email ? await queryUserByEmail(email) : await queryUserAdminId(admin_id);

    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        error: `${admin_id ? "ID" : "Email"} atau password tidak valid`,
      });
    }

    if (!user.is_verified) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        error: "Email atau password tidak valid",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password).then((result) => {
      return result;
    });

    if (!isPasswordValid) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        error: `${admin_id ? "ID" : "Email"} atau password tidak valid`,
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      JWT_SECRET,
    );

    res.status(200).json({
      status: true,
      message: "Login berhasil",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Authenticated User / admin
const authenticated = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Bad Request",
        error: "User Tidak ditemukan",
      });
    }

    res.status(200).json({
      status: true,
      message: "User terverifikasi",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password User
const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone_number } = req.body;

    const user = email
      ? await queryUserByEmail(email)
      : await prisma.profiles.findUnique({
          where: {
            phone_number,
          },
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "Bad Request",
        error: "User Tidak ditemukan",
      });
    }

    const token = jwt.sign(
      {
        id: email ? user.id : user.user_id,
      },
      JWT_SECRET,
      {
        expiresIn: "3m",
      },
    );

    const path = `http://localhost:3000/resetPassword?token=${token}`;

    const template = emailTemplate(
      path,
      "Reset Password",
      "Klik tombol di bawah untuk reset password",
    );

    sendEmail(email ? email : user.user.email, "Link untuk reset password", template);

    res.status(200).json({
      status: true,
      message: "Link untuk reset password telah dikirim ke email kamu!",
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password user
const resetPassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { new_password, confirm_new_password } = req.body;

    VSResetPassword.parse(req.body);

    if (new_password !== confirm_new_password) {
      return res.status(400).json({
        status: false,
        message: "Bad Request",
        error: "Password dan Confirmation Password harus sama",
      });
    }

    const decryptedPassword = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        password: decryptedPassword,
      },
    });

    res.status(200).json({
      status: true,
      message: "Password telah berhasil diubah",
    });
  } catch (error) {
    next(error);
  }
};

// Verify User
const verifyUser = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.is_verified) {
      return res.send("Email sudah terverifikasi, silahkan login");
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        is_verified: true,
      },
    });

    res.redirect("http://localhost:3000/login");
  } catch (error) {
    next(error);
  }
};

const googleOauth2 = (req, res) => {
  let token = jwt.sign({ id: req.user.id }, JWT_SECRET);

  return res.status(200).json({
      status: true,
      message: 'OK',
      err: null,
      data: { user: req.user, token }
  });
}

module.exports = { register, login, authenticated, resetPassword, forgotPassword, verifyUser, googleOauth2 };
