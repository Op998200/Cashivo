import { supabase } from '/script/supabase.js'; // adjust path if needed

// UI Elements
const noteInput = document.getElementById("note");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const entryList = document.getElementById("entryList");
const addEntryBtn = document.getElementById("addEntryBtn");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const logoutBtn = document.getElementById("logoutBtn");

const imageInput = document.getElementById("imageInput");
const imageComment = document.getElementById("imageComment");
const imageType = document.getElementById("imageType");
const uploadImageBtn = document.getElementById("uploadImageBtn");

let currentUser = null;

// ✅ Auth check
supabase.auth.getUser().then(({ data: { user } }) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadEntries();
  }
});

// ✅ Manual Entry
addEntryBtn.addEventListener("click", async () => {
  const note = noteInput.value;
  const amount = parseFloat(amountInput.value);
  const type = typeInput.value;

  console.log("🔍 Input:", { note, amount, type });

  const session = await supabase.auth.getSession();
  const user = session.data.session?.user;

  if (!user) return alert("❌ Not logged in!");

  const { error } = await supabase.from("entries").insert([{
    user_id: user.id,
    note,
    amount,
    type,
  }]);

  if (error) {
    console.error("🔥 Entry Error:", error);
    alert("❌ Failed: " + error.message);
  } else {
    console.log("✅ Entry Added");
    noteInput.value = "";
    amountInput.value = "";
    loadEntries();
  }
});


// ✅ Load Entries
async function loadEntries() {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    alert("❌ Error loading entries: " + error.message);
    return;
  }

  entryList.innerHTML = "";
  let income = 0;
  let expense = 0;

  data.forEach(entry => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${entry.note}</strong><br>
      ₹${entry.amount} (${entry.type})
      ${entry.image_url ? `<br><img src="${entry.image_url}" style="max-width:100px;">` : ""}
    `;
    entryList.appendChild(li);

    if (entry.type === "income") income += entry.amount;
    else expense += entry.amount;
  });

  totalIncome.textContent = income;
  totalExpense.textContent = expense;
}

// ✅ Image + Comment Entry
uploadImageBtn.addEventListener("click", async () => {
  const file = imageInput.files[0];
  const comment = imageComment.value;
  const type = imageType.value;

  if (!file || !comment) return alert("❌ Fill all fields");

  const amountMatch = comment.match(/₹?(\d+)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
  if (!amount) return alert("❌ Add amount in comment (e.g. ₹1200)");

  const filePath = `entries/${currentUser.id}/${Date.now()}_${file.name}`;

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (uploadErr) return alert("❌ Upload error: " + uploadErr.message);

  const { data: urlData } = supabase
    .storage
    .from("images")
    .getPublicUrl(filePath);

  const { error } = await supabase.from("entries").insert([{
    user_id: currentUser.id,
    note: comment,
    amount,
    type,
    image_url: urlData.publicUrl
  }]);

  if (error) {
    alert("❌ Failed to save entry: " + error.message);
  } else {
    imageInput.value = "";
    imageComment.value = "";
    loadEntries();
  }
});

// ✅ Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "index.html";
});
