const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyAdmin = require("../middleware/authMiddleware");

function slugify(value) {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function validateBlog(body, requireAll = true) {
    body = body && typeof body === "object" ? body : {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const slugInput = typeof body.slug === "string" ? body.slug.trim() : "";
    const slug = slugify(slugInput || title);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : "";
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
    const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";

    if (
        (requireAll || body.title !== undefined) &&
        (!title || title.length > 255)
    ) {
        return { error: "Article title is required and must be 255 characters or fewer." };
    }
    if (
        (requireAll || body.slug !== undefined || body.title !== undefined) &&
        (!slug || slug.length > 255)
    ) {
        return { error: "A valid article slug could not be created." };
    }
    if (
        (requireAll || body.content !== undefined) &&
        (!content || content.length > 1000000)
    ) {
        return { error: "Article content is required and must be 1,000,000 characters or fewer." };
    }
    if (
        (requireAll || body.author !== undefined) &&
        (!author || author.length > 120)
    ) {
        return { error: "Article author is required and must be 120 characters or fewer." };
    }
    if (excerpt.length > 65535) {
        return { error: "Article excerpt is too long." };
    }
    if (imageUrl.length > 2048) {
        return { error: "Article image URL is too long." };
    }
    if (
        imageUrl &&
        !/^https?:\/\//i.test(imageUrl)
    ) {
        return { error: "Article image must use an HTTP or HTTPS URL." };
    }
    if (category.length > 100) {
        return { error: "Article category must be 100 characters or fewer." };
    }
    if (body.published !== undefined && typeof body.published !== "boolean") {
        return { error: "Article published status must be true or false." };
    }

    return {
        values: {
            title,
            slug,
            content,
            excerpt: excerpt || null,
            author,
            image_url: imageUrl || null,
            category: category || null,
            published: body.published === true
        }
    };
}

function handleWriteError(res, error, action) {
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "An article with this slug already exists."
        });
    }
    console.error(`${action} blog error:`, error.message);
    return res.status(500).json({
        success: false,
        message: `Unable to ${action} the blog article.`
    });
}

router.get("/admin", verifyAdmin, async (req, res) => {
    try {
        const [blogs] = await db.execute(
            `SELECT id, title, slug, content, excerpt, author, image_url,
                    category, published, created_at, updated_at
             FROM blogs
             ORDER BY updated_at DESC`
        );
        res.json({ success: true, count: blogs.length, blogs });
    } catch (error) {
        console.error("Admin blogs error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve blog articles."
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const [blogs] = await db.execute(
            `SELECT
                id,
                title,
                slug,
                excerpt,
                author,
                image_url,
                category,
                created_at
             FROM blogs
             WHERE published = TRUE
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            count: blogs.length,
            blogs
        });

    } catch (error) {
        console.error("Blogs error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve blog articles."
        });
    }
});


// GET: Retrieve one published article by its slug
router.get("/slug/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        const [blogs] = await db.execute(
            `SELECT
                id,
                title,
                slug,
                content,
                excerpt,
                author,
                image_url,
                category,
                created_at
             FROM blogs
             WHERE slug = ? AND published = TRUE`,
            [slug]
        );

        if (blogs.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blog article not found."
            });
        }

        res.json({
            success: true,
            blog: blogs[0]
        });

    } catch (error) {
        console.error("Single blog error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve the blog article."
        });
    }
});


// GET: Retrieve published articles by category
router.get("/category/:category", async (req, res) => {
    try {
        const { category } = req.params;

        const [blogs] = await db.execute(
            `SELECT
                id,
                title,
                slug,
                excerpt,
                author,
                image_url,
                category,
                created_at
             FROM blogs
             WHERE category = ? AND published = TRUE
             ORDER BY created_at DESC`,
            [category]
        );

        res.json({
            success: true,
            count: blogs.length,
            blogs
        });

    } catch (error) {
        console.error("Blog category error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve articles in this category."
        });
    }
});

router.post("/", verifyAdmin, async (req, res) => {
    const result = validateBlog(req.body);
    if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
    }

    try {
        const { title, slug, content, excerpt, author, image_url, category, published } = result.values;
        const [insert] = await db.execute(
            `INSERT INTO blogs
                (title, slug, content, excerpt, author, image_url, category, published)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, slug, content, excerpt, author, image_url, category, published]
        );
        res.status(201).json({
            success: true,
            message: "Blog article created successfully.",
            blogId: insert.insertId
        });
    } catch (error) {
        handleWriteError(res, error, "create");
    }
});

router.put("/:id", verifyAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: "Invalid article ID." });
    }

    const result = validateBlog(req.body);
    if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
    }

    try {
        const { title, slug, content, excerpt, author, image_url, category, published } = result.values;
        const [update] = await db.execute(
            `UPDATE blogs SET
                title = ?, slug = ?, content = ?, excerpt = ?, author = ?,
                image_url = ?, category = ?, published = ?
             WHERE id = ?`,
            [title, slug, content, excerpt, author, image_url, category, published, id]
        );
        if (update.affectedRows === 0) {
            const [existing] = await db.execute("SELECT id FROM blogs WHERE id = ?", [id]);
            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: "Blog article not found." });
            }
        }
        res.json({ success: true, message: "Blog article updated successfully." });
    } catch (error) {
        handleWriteError(res, error, "update");
    }
});

router.delete("/:id", verifyAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: "Invalid article ID." });
    }

    try {
        const [result] = await db.execute("DELETE FROM blogs WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Blog article not found." });
        }
        res.json({ success: true, message: "Blog article deleted successfully." });
    } catch (error) {
        console.error("Delete blog error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to delete the blog article."
        });
    }
});

module.exports = router;