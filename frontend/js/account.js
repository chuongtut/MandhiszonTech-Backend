(() => {
    const API_BASE = "http://localhost:5000/api";
    const TOKEN_KEY = "mandhiszontech_customer_token";
    const loginForm = document.getElementById("customer-login-form");
    const registerForm = document.getElementById("customer-register-form");
    const loginButton = document.getElementById("login-button");
    const registerButton = document.getElementById("register-button");
    const loginMessage = document.getElementById("login-message");
    const registerMessage = document.getElementById("register-message");
    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");
    const loginPanel = document.getElementById("customer-login-panel");
    const registerPanel = document.getElementById("customer-register-panel");

    document.getElementById("current-year").textContent = String(new Date().getFullYear());

    function selectTab(tab) {
        const showLogin = tab === "login";
        loginTab.classList.toggle("is-active", showLogin);
        registerTab.classList.toggle("is-active", !showLogin);
        loginTab.setAttribute("aria-selected", String(showLogin));
        registerTab.setAttribute("aria-selected", String(!showLogin));
        loginPanel.classList.toggle("is-hidden", !showLogin);
        registerPanel.classList.toggle("is-hidden", showLogin);
    }

    loginTab.addEventListener("click", () => selectTab("login"));
    registerTab.addEventListener("click", () => selectTab("register"));

    async function request(path, body) {
        let response;
        try {
            response = await fetch(`${API_BASE}${path}`, {
                method: "POST",
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
        } catch {
            throw new Error("Could not connect to the server. Please try again.");
        }

        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("The server returned an unreadable response.");
        }
        if (!response.ok || payload.success === false) {
            throw new Error(payload.message || `The request failed (${response.status}).`);
        }
        return payload;
    }

    function showMessage(element, text) {
        element.textContent = text;
        element.classList.toggle("is-hidden", !text);
    }

    async function submitAccountForm(form, button, message, endpoint, fields, pendingText) {
        showMessage(message, "");
        button.disabled = true;
        button.querySelector("span:first-child").textContent = pendingText;
        const values = new FormData(form);
        const body = Object.fromEntries(fields.map((field) => [field, values.get(field)]));

        try {
            const result = await request(endpoint, body);
            if (!result.token || !result.customer) {
                throw new Error("The server did not return a customer session.");
            }
            sessionStorage.setItem(TOKEN_KEY, result.token);
            window.location.replace("index.html");
        } catch (error) {
            showMessage(message, error.message);
        } finally {
            button.disabled = false;
            button.querySelector("span:first-child").textContent =
                endpoint.endsWith("/login") ? "Sign in" : "Create account";
        }
    }

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitAccountForm(loginForm, loginButton, loginMessage, "/customers/login", ["email", "password"], "Signing in...");
    });
    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitAccountForm(registerForm, registerButton, registerMessage, "/customers/register", ["name", "email", "password"], "Creating account...");
    });

    async function restoreCustomerSession() {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE}/customers/me`, {
                headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                window.location.replace("index.html");
                return;
            }
            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem(TOKEN_KEY);
            }
        } catch {
            showMessage(loginMessage, "Could not verify your account session. Please try again.");
        }
    }

    restoreCustomerSession();
})();
