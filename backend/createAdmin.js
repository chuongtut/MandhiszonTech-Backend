const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function createAdmin() {
    const name = "MandhiszonTech Admin";
    const email = "admin@mandhiszontech.com";

    // Set ADMIN_PASSWORD in your terminal before running this script.
    const password = process.env.ADMIN_PASSWORD;

    if (!password || password.length < 12) {
        throw new Error(
            "Set ADMIN_PASSWORD to a strong password of at least 12 characters."
        );
    }

    const [existing] = await db.execute(
        "SELECT id FROM admins WHERE email = ?",
        [email]
    );

    if (existing.length > 0) {
        console.log("This administrator account already exists.");
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.execute(
        "INSERT INTO admins (name, email, password) VALUES (?, ?, ?)",
        [name, email, hashedPassword]
    );

    console.log("Administrator account created successfully.");
    console.log("Email:", email);
}

createAdmin()
    .catch((error) => {
        console.error("Could not create administrator:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.end();
    });