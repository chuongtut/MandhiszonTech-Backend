const express = require("express");
const router = express.Router();

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const db = require("../config/db");
const verifyAdmin = require("../middleware/authMiddleware");
const multer = require("multer");

const projectImageDirectory = path.join(__dirname, "..", "uploads", "projects");
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
    }
});

function receiveProjectImage(req, res, next) {
    imageUpload.single("image")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: error.code === "LIMIT_FILE_SIZE"
                    ? "Project images must be 5 MB or smaller."
                    : "Unable to process the uploaded project image."
            });
        }
        if (error) return next(error);
        next();
    });
}

function getImageExtension(buffer) {
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ".jpg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
    if (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) return ".webp";
    return null;
}

router.post("/upload-image", verifyAdmin, receiveProjectImage, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Choose a PNG, JPEG, or WebP project image."
        });
    }

    const extension = getImageExtension(req.file.buffer);
    if (!extension) {
        return res.status(400).json({
            success: false,
            message: "The uploaded file is not a valid PNG, JPEG, or WebP image."
        });
    }

    const filename = `${crypto.randomUUID()}${extension}`;
    try {
        await fs.mkdir(projectImageDirectory, { recursive: true });
        await fs.writeFile(path.join(projectImageDirectory, filename), req.file.buffer, { flag: "wx" });
        const apiOrigin = (
            process.env.PUBLIC_API_URL ||
            process.env.RENDER_EXTERNAL_URL ||
            `${req.protocol}://${req.get("host")}`
        ).replace(/\/+$/, "");
        res.status(201).json({
            success: true,
            image_url: `${apiOrigin}/uploads/projects/${filename}`
        });
    } catch (error) {
        console.error("Project image upload error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to save the project image."
        });
    }
});


// GET: Retrieve all projects (public)
router.get("/", async (req, res) => {
    try {
        const [projects] = await db.execute(
            "SELECT * FROM projects ORDER BY created_at DESC"
        );

        res.json({
            success: true,
            count: projects.length,
            projects
        });

    } catch (error) {
        console.error("Projects error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve projects."
        });
    }
});


// GET: Retrieve one project (public)
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const [projects] = await db.execute(
            "SELECT * FROM projects WHERE id = ?",
            [id]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        res.json({
            success: true,
            project: projects[0]
        });

    } catch (error) {
        console.error("Project error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve project."
        });
    }
});


// POST: Add project (admin only)
router.post("/", verifyAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            technologies,
            image_url,
            github_url,
            live_url,
            category
        } = req.body;

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            !title.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Project title and description are required."
            });
        }

        if (title.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Project title is too long."
            });
        }

        const optionalFields = [
            technologies,
            image_url,
            github_url,
            live_url,
            category
        ];

        if (optionalFields.some(value =>
            value !== undefined &&
            value !== null &&
            typeof value !== "string"
        )) {
            return res.status(400).json({
                success: false,
                message: "Optional project fields must be text."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO projects
            (title, description, technologies, image_url,
             github_url, live_url, category)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                description.trim(),
                technologies?.trim() || null,
                image_url?.trim() || null,
                github_url?.trim() || null,
                live_url?.trim() || null,
                category?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Project added successfully.",
            projectId: result.insertId
        });

    } catch (error) {
        console.error("Add project error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to add project."
        });
    }
});


// PUT: Update project (admin only)
router.put("/:id", verifyAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const {
            title,
            description,
            technologies,
            image_url,
            github_url,
            live_url,
            category
        } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        if (
            typeof title !== "string" ||
            typeof description !== "string" ||
            !title.trim() ||
            !description.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Project title and description are required."
            });
        }

        const optionalFields = [
            technologies,
            image_url,
            github_url,
            live_url,
            category
        ];

        if (optionalFields.some(value =>
            value !== undefined &&
            value !== null &&
            typeof value !== "string"
        )) {
            return res.status(400).json({
                success: false,
                message: "Optional project fields must be text."
            });
        }

        const [result] = await db.execute(
            `UPDATE projects SET
                title = ?,
                description = ?,
                technologies = ?,
                image_url = ?,
                github_url = ?,
                live_url = ?,
                category = ?
             WHERE id = ?`,
            [
                title.trim(),
                description.trim(),
                technologies?.trim() || null,
                image_url?.trim() || null,
                github_url?.trim() || null,
                live_url?.trim() || null,
                category?.trim() || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            const [existing] = await db.execute(
                "SELECT id FROM projects WHERE id = ?",
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found."
                });
            }
        }

        res.json({
            success: true,
            message: "Project updated successfully."
        });

    } catch (error) {
        console.error("Update project error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update project."
        });
    }
});


// DELETE: Delete project (admin only)
router.delete("/:id", verifyAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const [result] = await db.execute(
            "DELETE FROM projects WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        res.json({
            success: true,
            message: "Project deleted successfully."
        });

    } catch (error) {
        console.error("Delete project error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to delete project."
        });
    }
});

module.exports = router;