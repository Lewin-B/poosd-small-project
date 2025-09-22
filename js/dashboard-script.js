const API_BASE_URL = "http://134.199.200.196/LAMPAPI";

// Global state
let currentUserId = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  currentUserId = localStorage.getItem("userId");

  if (currentUserId) {
    showMainDashboard();
  } else {
    showNoSessionAlert();
  }

  setupEventListeners();
}

function showNoSessionAlert() {
  document.getElementById("noSessionAlert").style.display = "block";
  document.getElementById("mainDashboard").style.display = "none";
  document.getElementById("userInfo").style.display = "none";
}

function showMainDashboard() {
  document.getElementById("noSessionAlert").style.display = "none";
  document.getElementById("mainDashboard").style.display = "block";
  document.getElementById("userInfo").style.display = "flex";
  document.getElementById("currentUserId").textContent = currentUserId;
}

function setupEventListeners() {
  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);

  // Main dashboard forms
  document
    .getElementById("searchForm")
    .addEventListener("submit", handleSearch);
  document
    .getElementById("addForm")
    .addEventListener("submit", handleAddContact);

  // NOTE: Your HTML doesn’t include a #deleteForm; guard it so we don’t crash
  const deleteForm = document.getElementById("deleteForm");
  if (deleteForm) {
    deleteForm.addEventListener("submit", handleDeleteContact);
  }
}

function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("userId");
    currentUserId = null;
    window.location.href = "/";
  }
}

function showMessage(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => {
    element.classList.remove("show");
  }, 5000);
}

function showLoading(elementId, show = true) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = show ? "block" : "none";
}

function clearResults() {
  const resultsContainer = document.getElementById("searchResults");
  resultsContainer.innerHTML =
    '<div class="no-results" id="noSearchResults">No contacts found</div>';
  resultsContainer.style.display = "none";
}

function clearAllForms() {
  document.getElementById("searchForm").reset();
  document.getElementById("addForm").reset();
  const deleteForm = document.getElementById("deleteForm");
  if (deleteForm) deleteForm.reset();
}

// Search Contacts Handler
async function handleSearch(e) {
  e.preventDefault();

  if (!currentUserId) {
    showMessage(
      "searchError",
      "User ID not found. Please refresh the page.",
      true
    );
    return;
  }

  const formData = new FormData(e.target);
  const searchQuery = formData.get("search");

  showLoading("searchLoading", true);
  clearResults();

  try {
    const response = await fetch(`${API_BASE_URL}/SearchContacts.php`, {
      method: "POST",
      body: JSON.stringify({
        userId: currentUserId.toString(),
        nameQuery: searchQuery,
      }),
    });

    const data = await response.json();

    if (response.ok && data.results) {
      displaySearchResults(data.results);
      showMessage("searchSuccess", `Found ${data.results.length} contact(s)`);
    } else {
      showMessage(
        "searchError",
        data.error || "Failed to search contacts",
        true
      );
    }
  } catch (error) {
    console.error("Search error:", error);
    showMessage("searchError", "Network error occurred while searching", true);
  } finally {
    showLoading("searchLoading", false);
  }
}

function displaySearchResults(contacts) {
  const resultsContainer = document.getElementById("searchResults");
  const noResults = document.getElementById("noSearchResults");

  if (contacts.length === 0) {
    noResults.style.display = "block";
    resultsContainer.style.display = "block";
    return;
  }

  noResults.style.display = "none";

  const contactsHTML = contacts
    .map(
      (contact) => `
        <div class="contact-item" id="contact-${
          contact.id
        }" data-contact='${JSON.stringify({
        id: contact.id,
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        phone: contact.phone || "",
      }).replace(/'/g, "&apos;")}'>
            <div class="contact-actions">
                <button class="edit-contact-btn" onclick="enterEditMode(${
                  contact.id
                })">
                    Edit
                </button>
                <button class="delete-contact-btn" onclick="deleteContactFromSearch(${
                  contact.id
                })">
                    Delete
                </button>
            </div>
            <div class="contact-name">${escapeHtml(
              contact.firstName || ""
            )} ${escapeHtml(contact.lastName || "")}</div>
            <div class="contact-detail"><strong>ID:</strong> ${contact.id}</div>
            <div class="contact-detail"><strong>Email:</strong> ${escapeHtml(
              contact.email || "N/A"
            )}</div>
            <div class="contact-detail"><strong>Phone:</strong> ${escapeHtml(
              contact.phone || "N/A"
            )}</div>
        </div>
    `
    )
    .join("");

  resultsContainer.innerHTML = contactsHTML;
  resultsContainer.style.display = "block";
}

// [EDITING] — Enter inline edit mode for a specific card
window.enterEditMode = function (contactId) {
  const card = document.getElementById(`contact-${contactId}`);
  if (!card) return;

  const data = JSON.parse(
    card.getAttribute("data-contact").replace(/&apos;/g, "'")
  );

  card.innerHTML = `
    <div class="contact-edit">
      <div><strong>Editing Contact #${contactId}</strong></div>

      <div class="form-row">
        <div>
          <label>First Name</label>
          <input id="edit-firstName-${contactId}" type="text" value="${escapeAttr(
    data.firstName
  )}" />
        </div>
        <div>
          <label>Last Name</label>
          <input id="edit-lastName-${contactId}" type="text" value="${escapeAttr(
    data.lastName
  )}" />
        </div>
      </div>

      <div class="form-row">
        <div>
          <label>Email</label>
          <input id="edit-email-${contactId}" type="email" value="${escapeAttr(
    data.email
  )}" />
        </div>
        <div>
          <label>Phone</label>
          <input id="edit-phone-${contactId}" type="tel" value="${escapeAttr(
    data.phone
  )}" />
        </div>
      </div>

      <div class="actions">
        <button class="save-contact-btn" onclick="saveEdit(${contactId})">Save</button>
        <button class="cancel-edit-btn" onclick="cancelEdit(${contactId})">Cancel</button>
      </div>
    </div>
  `;
};

// [EDITING] — Save edit
window.saveEdit = async function (contactId) {
  if (!currentUserId) {
    showMessage(
      "searchError",
      "User ID not found. Please refresh the page.",
      true
    );
    return;
  }

  // Collect values
  const firstName = document
    .getElementById(`edit-firstName-${contactId}`)
    .value.trim();
  const lastName = document
    .getElementById(`edit-lastName-${contactId}`)
    .value.trim();
  const email = (
    document.getElementById(`edit-email-${contactId}`).value || ""
  ).trim();
  const phone = (
    document.getElementById(`edit-phone-${contactId}`).value || ""
  ).trim();

  // Basic validation
  if (!firstName || !lastName) {
    showMessage("searchError", "First name and last name are required", true);
    return;
  }
  if (email && !isValidEmail(email)) {
    showMessage("searchError", "Please enter a valid email address", true);
    return;
  }

  try {
    // Assumes your backend exposes UpdateContact.php
    const response = await fetch(`${API_BASE_URL}/EditContact.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: parseInt(currentUserId, 10),
        id: parseInt(contactId, 10),
        firstName,
        lastName,
        email,
        phone,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("searchSuccess", "Contact updated successfully!");
      // Refresh the list so the card goes back to display mode with new data
      document.getElementById("searchForm").dispatchEvent(new Event("submit"));
    } else {
      showMessage(
        "searchError",
        data.error || "Failed to update contact",
        true
      );
    }
  } catch (err) {
    console.error("Update contact error:", err);
    showMessage(
      "searchError",
      "Network error occurred while updating contact",
      true
    );
  }
};

// Cancel edit
window.cancelEdit = function (contactId) {
  const searchForm = document.getElementById("searchForm");
  if (document.getElementById("searchResults").style.display === "block") {
    searchForm.dispatchEvent(new Event("submit"));
  }
};

// Add Contact Handler
async function handleAddContact(e) {
  e.preventDefault();

  if (!currentUserId) {
    showMessage(
      "addError",
      "User ID not found. Please refresh the page.",
      true
    );
    return;
  }

  const formData = new FormData(e.target);
  const contactData = {
    userId: currentUserId,
    firstName: formData.get("firstName").trim(),
    lastName: formData.get("lastName").trim(),
    email: formData.get("email").trim() || "",
    phone: formData.get("phone").trim() || "",
  };

  // Basic validation
  if (!contactData.firstName || !contactData.lastName) {
    showMessage("addError", "First name and last name are required", true);
    return;
  }

  // Email validation if provided
  if (contactData.email && !isValidEmail(contactData.email)) {
    showMessage("addError", "Please enter a valid email address", true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/AddContact.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactData),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("addSuccess", "Contact added successfully!");
      e.target.reset();
      if (document.getElementById("searchResults").style.display === "block") {
        document
          .getElementById("searchForm")
          .dispatchEvent(new Event("submit"));
      }
    } else {
      showMessage("addError", data.error || "Failed to add contact", true);
    }
  } catch (error) {
    console.error("Add contact error:", error);
    showMessage(
      "addError",
      "Network error occurred while adding contact",
      true
    );
  }
}

async function handleDeleteContact(e) {
  e.preventDefault();

  if (!currentUserId) {
    showMessage(
      "deleteError",
      "User ID not found. Please refresh the page.",
      true
    );
    return;
  }

  const formData = new FormData(e.target);
  const contactId = parseInt(formData.get("contactId"));

  if (!contactId || contactId <= 0) {
    showMessage("deleteError", "Please enter a valid Contact ID", true);
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this contact? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/DeleteContact.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        contactId: contactId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("deleteSuccess", "Contact deleted successfully!");
      e.target.reset();

      if (document.getElementById("searchResults").style.display === "block") {
        document
          .getElementById("searchForm")
          .dispatchEvent(new Event("submit"));
      }
    } else {
      showMessage(
        "deleteError",
        data.error || "Failed to delete contact",
        true
      );
    }
  } catch (error) {
    console.error("Delete contact error:", error);
    showMessage(
      "deleteError",
      "Network error occurred while deleting contact",
      true
    );
  }
}

async function deleteContactFromSearch(contactId) {
  if (!currentUserId) {
    showMessage(
      "searchError",
      "User ID not found. Please refresh the page.",
      true
    );
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this contact? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/DeleteContact.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUserId,
        contactId: contactId,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage("searchSuccess", "Contact deleted successfully!");
      document.getElementById("searchForm").dispatchEvent(new Event("submit"));
    } else {
      showMessage(
        "searchError",
        data.error || "Failed to delete contact",
        true
      );
    }
  } catch (error) {
    console.error("Delete contact error:", error);
    showMessage(
      "searchError",
      "Network error occurred while deleting contact",
      true
    );
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function handleApiError(response, data) {
  if (response.status === 401) {
    localStorage.removeItem("userId");
    currentUserId = null;
    alert("Your session has expired. Please log in again.");
    window.location.href = "/login";
    return "Session expired. Please log in again.";
  } else if (response.status === 404) {
    return "Resource not found. Please check your input.";
  } else if (response.status >= 500) {
    return "Server error. Please try again later.";
  } else {
    return data.error || "An unexpected error occurred.";
  }
}

document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    const searchInput = document.getElementById("searchQuery");
    if (
      searchInput &&
      document.getElementById("mainDashboard").style.display !== "none"
    ) {
      searchInput.focus();
    }
  }

  if (e.key === "Escape") {
    clearResults();
    clearAllMessages();
  }
});

function clearAllMessages() {
  const messages = document.querySelectorAll(".message.show");
  messages.forEach((msg) => msg.classList.remove("show"));
}

window.addEventListener("popstate", function () {
  initializeApp();
});
