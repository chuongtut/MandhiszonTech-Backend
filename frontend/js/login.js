(() => {
    const API_BASE = window.MANDHISZONTECH_API_BASE || "http://localhost:5000/api";
    const TOKEN_KEY = "mandhiszontech_admin_token";
    const form = document.getElementById("login-form");
    const button = document.getElementById("login-button");
    const message = document.getElementById("login-message");

    document.getElementById("current-year").textContent = String(new Date().getFullYear());

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers
            }
        });
        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("The server returned an unreadable response.");
        }
        if (!response.ok || payload.success === false) {
            const error = new Error(payload.message || `The request failed (${response.status}).`);
            error.status = response.status;
            throw error;
        }
        return payload;
    }

    function showMessage(text) {
        message.textContent = text;
        message.classList.toggle("is-hidden", !text);
    }

    function setPending(isPending) {
        button.disabled = isPending;
        button.querySelector("span:first-child").textContent = isPending
            ? "Signing in..."
            : "Sign in to dashboard";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");
        setPending(true);
        const values = new FormData(form);

        try {
            const result = await request("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: values.get("email"),
                    password: values.get("password")
                })
            });
            if (!result.token || !result.admin) {
                throw new Error("The server did not return an administrator session.");
            }
            sessionStorage.setItem(TOKEN_KEY, result.token);
            window.location.replace("dashboard.html");
        } catch (error) {
            showMessage(error instanceof TypeError
                ? "Could not connect to the server. Check that the backend is running and try again."
                : error.message);
        } finally {
            setPending(false);
        }
    });

    async function redirectIfAuthenticated() {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!token) return;
        setPending(true);
        try {
            await request("/auth/me", {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.replace("dashboard.html");
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                sessionStorage.removeItem(TOKEN_KEY);
            } else {
                showMessage(error instanceof TypeError
                    ? "Could not verify your session because the server is unavailable."
                    : error.message);
            }
        } finally {
            setPending(false);
        }
    }

    redirectIfAuthenticated();
})();
