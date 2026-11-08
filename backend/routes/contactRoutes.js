const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyAdmin = require("../middleware/authMiddleware");

// POST: Save a contact message
router.post("/", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body || {};

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof message !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required."
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedName = name.trim();
        const normalizedEmail = email.trim();
        const normalizedSubject = typeof subject === "string" ? subject.trim() : "";
        const normalizedMessage = message.trim();

        if (
            normalizedName.length > 120 ||
            normalizedEmail.length > 254 ||
            normalizedSubject.length > 255 ||
            normalizedMessage.length > 65535
        ) {
            return res.status(400).json({
                success: false,
                message: "One or more contact fields exceed the maximum allowed length."
            });
        }

        if (!emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }
        if (subject !== undefined && subject !== null && typeof subject !== "string") {
            return res.status(400).json({
                success: false,
                message: "Subject must be text."
            });
        }

        const sql = `
            INSERT INTO contacts (name, email, subject, message)
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await db.execute(sql, [
            normalizedName,
            normalizedEmail,
            normalizedSubject || null,
            normalizedMessage
        ]);

        res.status(201).json({
            success: true,
            message: "Your message has been received successfully.",
            contactId: result.insertId
        });

    } catch (error) {
        console.error("Contact API error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to submit your message. Please try again."
        });
    }
});

// Contact messages contain personal information and are administrator-only.
router.get("/", verifyAdmin, async (req, res) => {
    try {
        const [contacts] = await db.execute(`
            SELECT id, name, email, subject, message, created_at
            FROM contacts
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            count: contacts.length,
            contacts
        });

    } catch (error) {
        console.error("Retrieve contacts error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve contact messages."
        });
    }
});

module.exports = router;