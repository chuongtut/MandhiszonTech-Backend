const express = require("express");
const cors = require("cors");
const path = require("node:path");
const db = require("./config/db");
const contactRoutes = require("./routes/contactRoutes");
const serviceRoutes = require("./routes/servicesRoutes");
const projectRoutes = require("./routes/projectRoutes");
const blogRoutes = require("./routes/blogRoutes");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");


const app = express();

app.use(cors({
    origin: [
        "https://mandhiszontech.netlify.app",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://localhost:5501",
        process.env.FRONTEND_URL
    ].filter(Boolean)
}));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    dotfiles: "deny",
    index: false,
    maxAge: "1y"
}));

// Contact API
app.use("/api/contacts", contactRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);

// Homepage API
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to MandhiszonTech API",
        status: "running"
    });
});

// Database health check
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT DATABASE() AS databaseName"
        );

        res.json({
            status: "success",
            message: "Database connected successfully",
            database: rows[0].databaseName
        });
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await db.query("SELECT 1");
    } catch (error) {
        console.error("Could not connect to the configured MySQL database:", error.message);
        await db.end();
        process.exitCode = 1;
        return;
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`MandhiszonTech API running on port ${PORT}`);
    });
}

startServer();