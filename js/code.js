class AuthHandler {
  constructor() {
    this.apiBase = "http://134.199.200.196/LAMPAPI";
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupFormToggle();
    this.setupPasswordStrength();
  }

  setupEventListeners() {
    // Form toggle buttons
    const toggleBtns = document.querySelectorAll(".toggle-btn");
    toggleBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => this.toggleForm(e));
    });

    // Form submissions
    document
      .getElementById("loginForm")
      .addEventListener("submit", (e) => this.handleLogin(e));
    document
      .getElementById("registerForm")
      .addEventListener("submit", (e) => this.handleRegister(e));

    // Real-time validation
    this.setupRealTimeValidation();
  }

  setupFormToggle() {
    const slider = document.querySelector(".toggle-slider");
    const forms = document.querySelectorAll(".form");

    window.toggleForm = (formType) => {
      // Update slider position
      if (formType === "register") {
        slider.classList.add("register");
      } else {
        slider.classList.remove("register");
      }

      // Update active states
      document.querySelectorAll(".toggle-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      document
        .querySelector(`[data-form="${formType}"]`)
        .classList.add("active");

      // Show/hide forms
      forms.forEach((form) => form.classList.remove("active"));
      document.getElementById(`${formType}Form`).classList.add("active");

      // Clear previous messages
      this.clearMessages();
    };
  }

  toggleForm(e) {
    const formType = e.target.dataset.form;
    window.toggleForm(formType);
  }

  setupPasswordStrength() {
    const passwordInput = document.getElementById("registerPassword");
    const strengthIndicator = document.getElementById("passwordStrength");
    const strengthBar = document.getElementById("strengthBar");

    if (!passwordInput) return;

    passwordInput.addEventListener("input", (e) => {
      const password = e.target.value;

      if (password.length > 0) {
        strengthIndicator.classList.add("show");
        const strength = this.calculatePasswordStrength(password);
        this.updatePasswordStrengthUI(strengthBar, strength);
      } else {
        strengthIndicator.classList.remove("show");
      }
    });
  }

  calculatePasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score < 3) return "weak";
    if (score < 5) return "medium";
    return "strong";
  }

  updatePasswordStrengthUI(strengthBar, strength) {
    strengthBar.classList.remove(
      "strength-weak",
      "strength-medium",
      "strength-strong"
    );
    strengthBar.classList.add(`strength-${strength}`);
  }

  setupRealTimeValidation() {
    // Keep login email validation as-is, if you use email login
    const loginUsernameEl = document.getElementById("loginUsername");
    if (loginUsernameEl) {
      loginUsernameEl.addEventListener("blur", (e) => {
        this.validateUsername(e.target, "loginUsernameError");
      });
    }

    // NEW: first/last name + username validation for register form
    const firstNameEl = document.getElementById("registerFirstName");
    const lastNameEl = document.getElementById("registerLastName");
    const usernameEl = document.getElementById("registerUsername");

    if (firstNameEl) {
      firstNameEl.addEventListener("blur", () =>
        this.validateName(firstNameEl, "registerFirstNameError")
      );
    }

    if (lastNameEl) {
      lastNameEl.addEventListener("blur", () =>
        this.validateName(lastNameEl, "registerLastNameError")
      );
    }

    if (usernameEl) {
      usernameEl.addEventListener("blur", () =>
        this.validateUsername(usernameEl, "registerUsernameError")
      );
    }
  }

  // --- VALIDATION HELPERS ---

  validateEmail(input, errorId) {
    const username = input.value.trim();
    if (!username) {
      this.showFieldError(input, errorId, "Username is required");
      return false;
    }
    this.clearFieldError(input, errorId);
    return true;
  }

  validateUsername(input, errorId) {
    const username = input.value.trim();

    if (!username) {
      this.showFieldError(input, errorId, "Username is required");
      return false;
    } else {
      this.clearFieldError(input, errorId);
      return true;
    }
  }

  validateName(input, errorId) {
    const name = input.value.trim();
    if (!name) {
      this.showFieldError(input, errorId, "This field is required");
      return false;
    } else if (name.length < 2) {
      this.showFieldError(input, errorId, "Must be at least 2 characters");
      return false;
    } else {
      this.clearFieldError(input, errorId);
      return true;
    }
  }

  // --- UI HELPERS ---

  showFieldError(input, errorId, message) {
    input.classList.add("error");
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add("show");
    }
  }

  clearFieldError(input, errorId) {
    input.classList.remove("error");
    const errorElement = document.getElementById(errorId);
    if (errorElement) errorElement.classList.remove("show");
  }

  clearMessages() {
    // Clear success message
    const s = document.getElementById("successMessage");
    if (s) s.classList.remove("show");

    // Clear all error messages
    document.querySelectorAll(".error-message").forEach((error) => {
      error.classList.remove("show");
    });

    // Clear error styling from inputs
    document.querySelectorAll(".form-group input").forEach((input) => {
      input.classList.remove("error");
    });
  }

  showSuccessMessage(message) {
    const successElement = document.getElementById("successMessage");
    successElement.textContent = message;
    successElement.classList.add("show");
  }

  // --- HANDLERS ---

  async handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    // Clear previous messages
    this.clearMessages();

    if (!password) {
      this.showFieldError(
        document.getElementById("loginPassword"),
        "loginPasswordError",
        "Password is required"
      );
      return;
    }

    // Show loading state
    this.setLoadingState("login", true);

    try {
      const response = await this.makeAPICall(`${this.apiBase}/Login.php`, {
        username,
        password,
      });

      if (!response.error) {
        this.showSuccessMessage("Login successful! Redirecting...");

        if (response.token) {
          document.cookie = `auth_token=${response.token}; path=/; secure; samesite=strict`;
        }

        setTimeout(() => {
          window.location.href = response.redirect || "/dashboard.php";
        }, 1500);
      } else {
        this.showFieldError(
          document.getElementById("loginUsername"),
          "loginUsernameError",
          response.error || "Invalid email or password"
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      this.showFieldError(
        document.getElementById("loginUsername"),
        "loginUsernameError",
        "Network error. Please try again."
      );
    } finally {
      this.setLoadingState("login", false);
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const firstName = document.getElementById("registerFirstName").value.trim();
    const lastName = document.getElementById("registerLastName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;

    // Clear previous messages
    this.clearMessages();

    // Validate fields
    const isFirstValid = this.validateName(
      document.getElementById("registerFirstName"),
      "registerFirstNameError"
    );
    const isLastValid = this.validateName(
      document.getElementById("registerLastName"),
      "registerLastNameError"
    );
    const isUserValid = this.validateUsername(
      document.getElementById("registerUsername"),
      "registerUsernameError"
    );

    if (!password) {
      this.showFieldError(
        document.getElementById("registerPassword"),
        "registerPasswordError",
        "Password is required"
      );
      return;
    }

    if (password.length < 8) {
      this.showFieldError(
        document.getElementById("registerPassword"),
        "registerPasswordError",
        "Password must be at least 8 characters long"
      );
      return;
    }

    if (!isFirstValid || !isLastValid || !isUserValid) return;

    // Show loading state
    this.setLoadingState("register", true);

    try {
      // Updated payload: { firstName, lastName, username, password }
      const response = await this.makeAPICall(`${this.apiBase}/Register.php`, {
        firstName,
        lastName,
        username,
        password,
      });

      if (!response.error) {
        this.showSuccessMessage(response.message || "Registration successful!");

        // Clear form
        document.getElementById("registerForm").reset();
        const ps = document.getElementById("passwordStrength");
        if (ps) ps.classList.remove("show");

        // Switch to login form after delay
        setTimeout(() => {
          window.toggleForm("login");
        }, 3000);
      } else {
        // Handle field-specific errors from API if provided
        if (response.field) {
          const fieldMap = {
            firstName: ["registerFirstName", "registerFirstNameError"],
            lastName: ["registerLastName", "registerLastNameError"],
            username: ["registerUsername", "registerUsernameError"],
            password: ["registerPassword", "registerPasswordError"],
          };
          const pair = fieldMap[response.field];
          if (pair) {
            this.showFieldError(
              document.getElementById(pair[0]),
              pair[1],
              response.message || "Please correct this field."
            );
          } else {
            this.showSuccessMessage(response.message || "Registration failed.");
          }
        } else {
          // Generic failure
          this.showFieldError(
            document.getElementById("registerUsername"),
            "registerUsernameError",
            response.message || "Registration failed. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      this.showFieldError(
        document.getElementById("registerUsername"),
        "registerUsernameError",
        "Network error. Please try again."
      );
    } finally {
      this.setLoadingState("register", false);
    }
  }

  setLoadingState(formType, isLoading) {
    const btn = document.getElementById(`${formType}Btn`);
    const spinner = document.getElementById(`${formType}Spinner`);
    const btnText = btn.querySelector(".btn-text");

    if (isLoading) {
      btn.disabled = true;
      btnText.style.display = "none";
      spinner.style.display = "block";
    } else {
      btn.disabled = false;
      btnText.style.display = "inline";
      spinner.style.display = "none";
    }
  }

  async makeAPICall(url, data) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

// Initialize the auth handler when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new AuthHandler();
});

// Export for use in other modules if needed
if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthHandler;
}
