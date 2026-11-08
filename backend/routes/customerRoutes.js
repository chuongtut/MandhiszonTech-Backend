const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

function validateCredentials(email, password) {
    if (typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
        return "Email and password are required.";
    }

    if (email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return "Please provide a valid email address.";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters long.";
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
        return "Password must be 72 bytes or fewer.";
    }

    return null;
}

function createCustomerToken(customer) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing.");
    }
    return jwt.sign(
        { id: customer.id, email: customer.email, role: "customer" },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
    );
}

function getCustomerFromToken(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Sign in to continue." });
    }

    try {
        const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
        if (decoded.role !== "customer") {
            return res.status(403).json({ success: false, message: "Customer access required." });
        }
        req.customer = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Your session is invalid or has expired." });
    }
}

router.post("/register", async (req, res) => {
    const { name, email, password } = req.body || {};
    const credentialsError = validateCredentials(email, password);
    if (credentialsError) {
        return res.status(400).json({ success: false, message: credentialsError });
    }
    if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Your name is required." });
    }
    if (name.trim().length > 120) {
        return res.status(400).json({ success: false, message: "Name must be 120 characters or fewer." });
    }
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing.");
        return res.status(500).json({ success: false, message: "Authentication is not configured." });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const [existing] = await db.execute(
            "SELECT id FROM customers WHERE email = ?",
            [normalizedEmail]
        );
        if (existing.length) {
            return res.status(409).json({ success: false, message: "An account with this email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await db.execute(
            "INSERT INTO customers (name, email, password) VALUES (?, ?, ?)",
            [name.trim(), normalizedEmail, hashedPassword]
        );
        const customer = { id: result.insertId, name: name.trim(), email: normalizedEmail };
        res.status(201).json({
            success: true,
            message: "Your account has been created.",
            token: createCustomerToken(customer),
            customer
        });
    } catch (error) {
        console.error("Customer registration error:", error.message);
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }
        res.status(500).json({ success: false, message: "Unable to create your account. Please try again." });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    try {
        const [customers] = await db.execute(
            "SELECT id, name, email, password FROM customers WHERE email = ?",
            [email.trim().toLowerCase()]
        );
        if (!customers.length || !(await bcrypt.compare(password, customers[0].password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const customer = {
            id: customers[0].id,
            name: customers[0].name,
            email: customers[0].email
        };
        res.json({
            success: true,
            message: "You are signed in.",
            token: createCustomerToken(customer),
            customer
        });
    } catch (error) {
        console.error("Customer login error:", error.message);
        res.status(500).json({ success: false, message: "Unable to sign in. Please try again." });
    }
});

router.get("/me", getCustomerFromToken, async (req, res) => {
    try {
        const [customers] = await db.execute(
            "SELECT id, name, email, created_at FROM customers WHERE id = ?",
            [req.customer.id]
        );
        if (!customers.length) {
            return res.status(401).json({ success: false, message: "Customer account not found." });
        }
        res.json({ success: true, customer: customers[0] });
    } catch (error) {
        console.error("Customer profile error:", error.message);
        res.status(500).json({ success: false, message: "Unable to retrieve your account." });
    }
});

module.exports = router;
