import { supabase } from './supabase.js';

// UI Elements
const noteInput = document.getElementById("note");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const addEntryBtn = document.getElementById("addEntryBtn");
const entryList = document.getElementById("entryList");

const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const balance = document.getElementById("balance");

const logoutBtn = document.getElementById("logoutBtn");

const imageInput = document.getElementById("imageInput");
const uploadImageBtn = document.getElementById("uploadImageBtn");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");

const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

let currentUser = null;
let currentPage = 1;
const entriesPerPage = 5;

// ✅ Auth check
supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadEntries();
  }
});

// ✅ Add Manual Entry
addEntryBtn.addEventListener("click", async () => {
  const note = noteInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;

  if (!note || isNaN(amount)) return alert("❌ Enter valid note and amount");

  const { error } = await supabase.from("entries").insert([{
    user_id: currentUser.id,
    note,
    amount,
    type,
  }]);

  if (error) {
    alert("❌ Failed to add entry: " + error.message);
  } else {
    noteInput.value = "";
    amountInput.value = "";
    loadEntries(currentPage);
  }
});

// ✅ Load Entries with Pagination & Editing
async function loadEntries(page = 1) {
  currentPage = page;
  const offset = (page - 1) * entriesPerPage;

  const { data, error, count } = await supabase
    .from("entries")
    .select("*", { count: "exact" })
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + entriesPerPage - 1);

  if (error) return alert("❌ Error loading entries: " + error.message);

  entryList.innerHTML = "";
  let income = 0, expense = 0;

  data.forEach(entry => {
    const li = document.createElement("li");

    const displayDiv = document.createElement("div");
    displayDiv.innerHTML = `
      <strong class="note">${entry.note || "🖼 Receipt Entry"}</strong><br>
      <span class="amount">₹${entry.amount || "--"}</span>
      <span class="type">(${entry.type})</span><br>
      ${entry.image_url ? entry.image_url.split(',').map(url => `<img src="${url}" style="max-width:100px;">`).join(" ") : ""}
      <br>
      <button class="editBtn">✏️ Edit</button>
      <button class="deleteBtn" data-id="${entry.id}">🗑️ Delete</button>
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

    if (entry.type === "income") income += entry.amount || 0;
    else if (entry.type === "expense") expense += entry.amount || 0;

    // Buttons
    const editBtn = displayDiv.querySelector(".editBtn");
    const deleteBtn = displayDiv.querySelector(".deleteBtn");
    const saveBtn = editDiv.querySelector(".saveBtn");
    const cancelBtn = editDiv.querySelector(".cancelBtn");

    const noteField = editDiv.querySelector(".edit-note");
    const amountField = editDiv.querySelector(".edit-amount");
    const typeField = editDiv.querySelector(".edit-type");

    editBtn.addEventListener("click", () => {
      displayDiv.style.display = "none";
      editDiv.style.display = "block";
    });

    cancelBtn.addEventListener("click", () => {
      editDiv.style.display = "none";
      displayDiv.style.display = "block";
    });

    saveBtn.addEventListener("click", async () => {
      const updatedNote = noteField.value.trim();
      const updatedAmount = parseFloat(amountField.value);
      const updatedType = typeField.value;

      if (!updatedNote || isNaN(updatedAmount)) {
        alert("❌ Please enter valid note and amount");
        return;
      }

      const { error: updateErr } = await supabase
        .from("entries")
        .update({
          note: updatedNote,
          amount: updatedAmount,
          type: updatedType
        })
        .eq("id", entry.id)
        .eq("user_id", currentUser.id);

      if (updateErr) {
        alert("❌ Update error: " + updateErr.message);
      } else {
        await loadEntries(currentPage); // 🔁 Reload
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = confirm("Are you sure?");
      if (!confirmDelete) return;

      const { error: deleteErr } = await supabase
        .from("entries")
        .delete()
        .eq("id", entry.id)
        .eq("user_id", currentUser.id);

      if (deleteErr) {
        alert("❌ Delete failed: " + deleteErr.message);
      } else {
        await loadEntries(currentPage); // 🔁 Reload
      }
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



// ✅ Pagination
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) loadEntries(currentPage - 1);
});
nextBtn.addEventListener("click", () => {
  loadEntries(currentPage + 1);
});

// ✅ Image Preview
imageInput.addEventListener("change", () => {
  imagePreviewContainer.innerHTML = "";
  const files = imageInput.files;
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "100px";
      img.style.margin = "5px";
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// ✅ Upload Images
uploadImageBtn.addEventListener("click", async () => {
  const files = imageInput.files;
  if (files.length === 0) return alert("❌ Select at least one image");

  let uploadedUrls = [];
  for (let file of files) {
    const path = `entries/${currentUser.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("images").upload(path, file);
    if (uploadErr) return alert("❌ Upload failed: " + uploadErr.message);

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
    uploadedUrls.push(urlData.publicUrl);
  }

  const { error } = await supabase.from("entries").insert([{
    user_id: currentUser.id,
    note: null,
    amount: null,
    type: "unassigned",
    image_url: uploadedUrls.join(",")
  }]);

  if (error) {
    alert("❌ Failed to save entry: " + error.message);
  } else {
    imageInput.value = "";
    imagePreviewContainer.innerHTML = "";
    loadEntries(currentPage);
  }
});

// ✅ Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});
