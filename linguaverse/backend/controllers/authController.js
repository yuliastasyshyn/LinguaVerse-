import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { pool } from "../db/index.js";

const verificationStore = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validatePassword(password = "") {
  return (
    password.length >= 8 &&
    /[A-ZА-ЯІЇЄҐ]/.test(password) &&
    /[a-zа-яіїєґ]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendVerificationCode(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Заповніть усі поля." });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Пароль має містити мінімум 8 символів, велику літеру, малу літеру, цифру та спеціальний символ.",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Користувач з такою поштою вже існує.",
      });
    }

    const code = generateCode();

    verificationStore.set(email, {
      name,
      email,
      password,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    try {
      const transporter = getTransporter();

      await transporter.sendMail({
        from: `"LinguaVerse.AI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "LinguaVerse.AI verification code",
        html: `
          <div style="font-family:Arial,sans-serif;background:#fbf7ee;padding:24px;">
            <div style="max-width:520px;margin:0 auto;background:#fffdf8;border-radius:18px;padding:24px;border:1px solid rgba(0,77,77,.15);">
              <h2 style="color:#004d4d;">LinguaVerse.AI</h2>
              <p style="color:#5d7370;">Ваш код підтвердження реєстрації:</p>
              <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#004d4d;background:#dcebe5;padding:18px;border-radius:14px;text-align:center;">
                ${code}
              </div>
              <p style="color:#5d7370;">Код дійсний 10 хвилин.</p>
            </div>
          </div>
        `,
      });

      return res.json({
        message: "Verification code sent",
      });
    } catch (mailError) {
      console.error("Email sending failed, DEV CODE:", code);
      console.error("Mail error:", mailError.message);

      return res.json({
        message: "Email sending failed, but dev code was generated",
        devCode: code,
      });
    }
  } catch (err) {
    console.error("sendVerificationCode error:", err);
    return res.status(500).json({ message: "Failed to send verification code" });
  }
}

// це потрібно, бо authRoutes.js імпортує register
export async function register(req, res) {
  return sendVerificationCode(req, res);
}

export async function verifyRegistrationCode(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const pending = verificationStore.get(email);

    if (!pending) {
      return res.status(400).json({
        message: "Код не знайдено. Надішліть код ще раз.",
      });
    }

    if (Date.now() > pending.expiresAt) {
      verificationStore.delete(email);
      return res.status(400).json({
        message: "Код протермінований. Надішліть новий код.",
      });
    }

    if (String(pending.code) !== String(code)) {
      return res.status(400).json({
        message: "Неправильний код підтвердження.",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      verificationStore.delete(email);
      return res.status(409).json({
        message: "Користувач з такою поштою вже існує.",
      });
    }

    const hashedPassword = await bcrypt.hash(pending.password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [pending.name, pending.email, hashedPassword]
    );

    verificationStore.delete(email);

    return res.status(201).json({
      message: "Account created successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("verifyRegistrationCode error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}