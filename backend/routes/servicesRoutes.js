const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyAdmin = require("../middleware/authMiddleware");

function parseServiceId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function validateService(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "A service object is required." };
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
        return { error: "Service name is required." };
    }
    if (body.name.trim().length > 120) {
        return { error: "Service name must be 120 characters or fewer." };
    }

    for (const field of ["category", "description"]) {
        if (body[field] !== undefined && body[field] !== null && typeof body[field] !== "string") {
            return { error: `${field === "category" ? "Category" : "Description"} must be text.` };
        }
    }

    const category = typeof body.category === "string" ? body.category.trim() : "";
    if (category.length > 100) {
        return { error: "Category must be 100 characters or fewer." };
    }
    if (typeof body.description === "string" && body.description.length > 5000) {
        return { error: "Description must be 5,000 characters or fewer." };
    }

    return {
        value: {
            name: body.name.trim(),
            category: category || null,
            description: typeof body.description === "string" && body.description.trim()
                ? body.description.trim()
                : null
        }
    };
}

// GET all services
router.get("/", async (req, res) => {
    try {
        const [services] = await db.execute(
            "SELECT * FROM services ORDER BY id ASC"
        );

        res.json({
            success: true,
            count: services.length,
            services
        });
    } catch (error) {
        console.error("Services error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve services."
        });
    }
});

// Create a service (administrator only)
router.post("/", verifyAdmin, async (req, res) => {
    const validation = validateService(req.body);
    if (validation.error) {
        return res.status(400).json({ success: false, message: validation.error });
    }

    try {
        const { name, category, description } = validation.value;
        const [result] = await db.execute(
            "INSERT INTO services (name, category, description) VALUES (?, ?, ?)",
            [name, category, description]
        );
        const [services] = await db.execute(
            "SELECT * FROM services WHERE id = ?",
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "Service created successfully.",
            service: services[0]
        });
    } catch (error) {
        console.error("Create service error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to create the service."
        });
    }
});

// Update a service (administrator only)
router.put("/:id", verifyAdmin, async (req, res) => {
    const id = parseServiceId(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, message: "Invalid service ID." });
    }

    const validation = validateService(req.body);
    if (validation.error) {
        return res.status(400).json({ success: false, message: validation.error });
    }

    try {
        const { name, category, description } = validation.value;
        const [result] = await db.execute(
            "UPDATE services SET name = ?, category = ?, description = ? WHERE id = ?",
            [name, category, description, id]
        );

        if (result.affectedRows === 0) {
            const [existing] = await db.execute(
                "SELECT id FROM services WHERE id = ?",
                [id]
            );
            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Service not found."
                });
            }
        }

        const [services] = await db.execute(
            "SELECT * FROM services WHERE id = ?",
            [id]
        );
        res.json({
            success: true,
            message: "Service updated successfully.",
            service: services[0]
        });
    } catch (error) {
        console.error("Update service error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update the service."
        });
    }
});

// Delete a service (administrator only)
router.delete("/:id", verifyAdmin, async (req, res) => {
    const id = parseServiceId(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, message: "Invalid service ID." });
    }

    try {
        const [result] = await db.execute(
            "DELETE FROM services WHERE id = ?",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        res.json({
            success: true,
            message: "Service deleted successfully."
        });
    } catch (error) {
        console.error("Delete service error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to delete the service."
        });
    }
});

// GET one service by ID
router.get("/:id", async (req, res) => {
    try {
        const id = parseServiceId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID."
            });
        }

        const [services] = await db.execute(
            "SELECT * FROM services WHERE id = ?",
            [id]
        );

        if (services.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found."
            });
        }

        res.json({
            success: true,
            service: services[0]
        });
    } catch (error) {
        console.error("Service error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve the service."
        });
    }
});

module.exports = router;
