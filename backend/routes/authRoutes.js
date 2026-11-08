const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const verifyAdmin = require("../middleware/authMiddleware");

const router = express.Router();

// Administrator login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const [admins] = await db.execute(
            "SELECT id, name, email, password FROM admins WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const admin = admins[0];

        const passwordMatches = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing.");

            return res.status(500).json({
                success: false,
                message: "Authentication is not configured."
            });
        }

        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                role: "admin"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        res.json({
            success: true,
            message: "Login successful.",
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email
            }
        });

    } catch (error) {
        console.error("Admin login error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to log in. Please try again."
        });
    }
});


// Check the currently authenticated administrator
router.get("/me", verifyAdmin, async (req, res) => {
    try {
        const [admins] = await db.execute(
            "SELECT id, name, email, created_at FROM admins WHERE id = ?",
            [req.admin.id]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Administrator account not found."
            });
        }

        res.json({
            success: true,
            admin: admins[0]
        });

    } catch (error) {
        console.error("Admin profile error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve administrator profile."
        });
    }
});

module.exports = router;