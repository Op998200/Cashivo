// script/auth.js
import { supabase } from './supabase.js';

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const status = document.getElementById("status");

// LOGIN
loginBtn?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value,
  });

  if (error) {
    status.textContent = "❌ " + error.message;
  } else {
    status.textContent = "✅ Logged in!";
    window.location.href = "dashboard.html";
  }
});

// SIGNUP
signupBtn?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value,
  });

  if (error) {
    status.textContent = "❌ " + error.message;
  } else {
    status.textContent = "✅ Check your email to confirm sign up!";
  }
});
