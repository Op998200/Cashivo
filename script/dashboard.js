// script/dashboard.js
import { supabase } from './supabase.js';

// 🌐 DOM Elements
const noteInput = document.getElementById("note");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const addEntryBtn = document.getElementById("addEntryBtn");

const entryList = document.getElementById("entryList");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const balance = document.getElementById("balance");

const imageInput = document.getElementById("imageInput");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");

const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let currentPage = 1;
const entriesPerPage = 5;

// 📛 Sanitize filename
function sanitizeFileName(originalName) {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop().toLowerCase();
  const base = originalName.split('.').slice(0, -1).join('.')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 15);
  return `${timestamp}_${base}.${ext}`;
}

// 🔐 Auth Check
supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;
  loadEntries();
});

// ➕ Add Manual Entry
addEntryBtn.addEventListener("click", async () => {
  const note = noteInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;

  if (!note || isNaN(amount)) return alert("❌ Enter valid note and amount");

  showLoading("Saving Entry...");
  const { error } = await supabase.from("entries").insert([{
    user_id: currentUser.id,
    note,
    amount,
    type
  }]);
  hideLoading();

  if (error) return alert("❌ Failed: " + error.message);

  noteInput.value = "";
  amountInput.value = "";
  loadEntries(currentPage);
});

// 📥 Load Entries
async function loadEntries(page = 1) {
  currentPage = page;
  showLoading("Loading entries...");
  const offset = (page - 1) * entriesPerPage;

  const { data, error, count } = await supabase
    .from("entries")
    .select("*", { count: "exact" })
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + entriesPerPage - 1);

  hideLoading();
  if (error) return alert("❌ Load error: " + error.message);

  entryList.innerHTML = "";
  let income = 0, expense = 0;

  data.forEach(entry => {
    const li = document.createElement("li");

    const displayDiv = document.createElement("div");
    displayDiv.innerHTML = `
      <strong class="note">${entry.note || "🖼 Receipt Entry"}</strong><br>
      <span class="amount">₹${entry.amount || "--"}</span>
      <span class="type">(${entry.type})</span><br>
      ${entry.image_url ? `<img src="${entry.image_url}" />` : ""}
      <br>
      <button class="editBtn">✏️ Edit</button>
      <button class="deleteBtn">🗑️ Delete</button>
    `;

    const editDiv = document.createElement("div");
    editDiv.style.display = "none";
    editDiv.innerHTML = `
      <input type="text" class="edit-note" value="${entry.note || ''}">
      <input type="number" class="edit-amount" value="${entry.amount || ''}">
      <select class="edit-type">
        <option value="income" ${entry.type === 'income' ? 'selected' : ''}>Income</option>
        <option value="expense" ${entry.type === 'expense' ? 'selected' : ''}>Expense</option>
        <option value="unassigned" ${entry.type === 'unassigned' ? 'selected' : ''}>Unassigned</option>
      </select>
      <br>
      <button class="saveBtn">💾 Save</button>
      <button class="cancelBtn">❌ Cancel</button>
    `;

    li.appendChild(displayDiv);
    li.appendChild(editDiv);
    entryList.appendChild(li);

    // Track totals
    if (entry.type === "income") income += entry.amount || 0;
    if (entry.type === "expense") expense += entry.amount || 0;

    // Edit & Delete
    displayDiv.querySelector(".editBtn").addEventListener("click", () => {
      displayDiv.style.display = "none";
      editDiv.style.display = "block";
    });

    editDiv.querySelector(".cancelBtn").addEventListener("click", () => {
      editDiv.style.display = "none";
      displayDiv.style.display = "block";
    });

    editDiv.querySelector(".saveBtn").addEventListener("click", async () => {
      const updatedNote = editDiv.querySelector(".edit-note").value.trim();
      const updatedAmount = parseFloat(editDiv.querySelector(".edit-amount").value);
      const updatedType = editDiv.querySelector(".edit-type").value;

      if (!updatedNote || isNaN(updatedAmount)) return alert("❌ Enter valid values");

      showLoading("Saving changes...");
      const { error: updateErr } = await supabase.from("entries").update({
        note: updatedNote,
        amount: updatedAmount,
        type: updatedType
      }).eq("id", entry.id).eq("user_id", currentUser.id);
      hideLoading();

      if (updateErr) return alert("❌ Update failed: " + updateErr.message);
      loadEntries(currentPage);
    });

    displayDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
      if (!confirm("Delete this entry?")) return;
      showLoading("Deleting...");
      const { error: deleteErr } = await supabase.from("entries")
        .delete()
        .eq("id", entry.id)
        .eq("user_id", currentUser.id);
      hideLoading();
      if (deleteErr) return alert("❌ Delete failed: " + deleteErr.message);
      loadEntries(currentPage);
    });
  });

  totalIncome.textContent = income;
  totalExpense.textContent = expense;
  balance.textContent = income - expense;

  const totalPages = Math.ceil(count / entriesPerPage);
  pageInfo.textContent = `Page ${page} of ${totalPages}`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

// 🔁 Pagination
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) loadEntries(currentPage - 1);
});
nextBtn.addEventListener("click", () => {
  loadEntries(currentPage + 1);
});

// 🖼 Preview images
imageInput.addEventListener("change", () => {
  imagePreviewContainer.innerHTML = "";
  const files = imageInput.files;
  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(files[i]);
  }
});

// ☁️ Upload Images
uploadImageBtn.addEventListener("click", async () => {
  const files = imageInput.files;
  if (!files.length) return alert("❌ Select at least one image");

  showLoading("Uploading Images...");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `entries/${currentUser.id}/${safeFileName}`;

    const { error: uploadErr } = await supabase.storage.from("images").upload(filePath, file);
    if (uploadErr) {
      hideLoading();
      return alert("❌ Upload failed: " + uploadErr.message);
    }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(filePath);

    const { error: insertErr } = await supabase.from("entries").insert([{
      user_id: currentUser.id,
      note: null,
      amount: null,
      type: "unassigned",
      image_url: urlData.publicUrl
    }]);

    if (insertErr) {
      hideLoading();
      return alert("❌ Entry failed: " + insertErr.message);
    }

    updateProgress(Math.round(((i + 1) / files.length) * 100));
    await new Promise(res => setTimeout(res, 50)); // smooth animation
  }

  imageInput.value = "";
  imagePreviewContainer.innerHTML = "";
  hideLoading();
  loadEntries(currentPage);
});

// 🚪 Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});

// ⏳ Loading Functions
function showLoading(text = "Loading...") {
  document.getElementById("loadingText").textContent = text;
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("loadingPopup").style.display = "flex";
}

function updateProgress(percent) {
  document.getElementById("progressFill").style.width = percent + "%";
}

function hideLoading() {
  document.getElementById("loadingPopup").style.display = "none";
}
