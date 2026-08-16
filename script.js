const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby12Upaf4pxs6yZf27Iz2hgmjWRQXK5EBT6FrgtlH1mK7LVH4-ZNGU6pXM27xBXbjny/exec";

const FIREBASE_HOST =
  "https://tan-is-man-default-rtdb.asia-southeast1.firebasedatabase.app";

const SESSION_KEY = "pendingRegistration";
const REMEMBER_DAYS = 30;
const REMEMBER_DATA_KEY = "rememberedData";
const REMEMBER_UNTIL_KEY = "rememberedUntil";

function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("deviceId", id);
  }
  return id;
}

function setStatus(message = "", type = "") {
  const status = document.getElementById("connection-status");
  if (!status) return;
  status.textContent = message;
  status.className = `connection-status${type ? ` is-${type}` : ""}`;
}

function goToScreen(screenId, step) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");
  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.classList.toggle("done", index < step);
  });
}

async function requestApi(payload) {
  const params = new URLSearchParams({ data: JSON.stringify(payload) });
  const response = await fetch(`${APPS_SCRIPT_URL}?${params}`, { redirect: "follow" });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("API response:", text);
    throw new Error("เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง");
  }
}

async function openDoor(room) {
  const roomKey = String(room).replace("/", "_");
  const url = `${FIREBASE_HOST}/door/${roomKey}/command.json`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Firebase returned ${response.status}`);
}

function clearForm() {
  ["reg-email", "reg-name", "reg-id", "reg-room"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
  document.querySelectorAll("#otp-inputs input").forEach((input) => { input.value = ""; });
  const remember = document.getElementById("remember-device");
  if (remember) remember.checked = false;
  const registerError = document.getElementById("register-error");
  const otpError = document.getElementById("otp-error");
  if (registerError) registerError.textContent = "";
  if (otpError) otpError.textContent = "";
  setStatus();
}

function getRememberedData() {
  const rememberedUntil = Number(localStorage.getItem(REMEMBER_UNTIL_KEY));
  if (!rememberedUntil) return null;
  if (rememberedUntil <= Date.now()) { clearRememberedData(); return null; }
  try {
    const data = JSON.parse(localStorage.getItem(REMEMBER_DATA_KEY) || "null");
    if (!data || !data.email || !data.name || !data.studentId || !data.room || !data.deviceId) return null;
    return data;
  } catch { return null; }
}

function saveRememberedData(registration) {
  localStorage.setItem(REMEMBER_DATA_KEY, JSON.stringify(registration));
  localStorage.setItem(REMEMBER_UNTIL_KEY, String(Date.now() + REMEMBER_DAYS * 86400000));
}

function clearRememberedData() {
  localStorage.removeItem(REMEMBER_DATA_KEY);
  localStorage.removeItem(REMEMBER_UNTIL_KEY);
}

document.addEventListener("DOMContentLoaded", () => {
  getDeviceId();
  goToScreen("screen-register", 1);
});

document.querySelectorAll("#otp-inputs input").forEach((input, index, inputs) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 1);
    if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && index > 0) inputs[index - 1].focus();
  });
  input.addEventListener("paste", (event) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    digits.split("").forEach((digit, offset) => {
      if (inputs[index + offset]) inputs[index + offset].value = digit;
    });
    inputs[Math.min(index + digits.length, inputs.length - 1)].focus();
  });
});

document.getElementById("btn-register").addEventListener("click", async () => {
  const registration = {
    email: document.getElementById("reg-email").value.trim(),
    name: document.getElementById("reg-name").value.trim(),
    studentId: document.getElementById("reg-id").value.trim(),
    room: document.getElementById("reg-room").value.trim(),
    deviceId: getDeviceId()
  };
  const remember = document.getElementById("remember-device").checked;
  const error = document.getElementById("register-error");
  const button = document.getElementById("btn-register");
  error.textContent = "";

  if (Object.values(registration).some((value) => !value)) {
    error.textContent = "กรุณากรอกข้อมูลให้ครบทุกช่อง";
    return;
  }
  if (!registration.email.toLowerCase().endsWith("@minburi.ac.th")) {
    error.textContent = "กรุณาใช้อีเมล @minburi.ac.th เท่านั้น";
    return;
  }

  button.disabled = true;

  try {
    if (remember) {
      button.textContent = "กำลังลงทะเบียน...";
      const data = await requestApi({ action: "saveDirectly", ...registration });
      if (!data.success) throw new Error(data.message || "ลงทะเบียนไม่สำเร็จ");
      saveRememberedData(registration);
      sessionStorage.removeItem(SESSION_KEY);
      const deviceRemembered = document.getElementById("device-remembered");
      if (deviceRemembered) deviceRemembered.style.display = "flex";
      goToScreen("screen-success", 3);
      try {
        await openDoor(registration.room);
      } catch (err) {
        setStatus(`ลงทะเบียนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`, "error");
      }
      return;
    }

    button.textContent = "กำลังส่ง OTP...";
    clearRememberedData();
    const data = await requestApi({ action: "register", ...registration });
    if (!data.success) throw new Error(data.message || "ส่ง OTP ไม่สำเร็จ");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(registration));
    document.getElementById("otp-email-target").textContent = registration.email;
    goToScreen("screen-otp", 2);

  } catch (err) {
    error.textContent = `ดำเนินการไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`;
  } finally {
    button.disabled = false;
    button.textContent = "ลงทะเบียน";
  }
});

document.getElementById("btn-verify").addEventListener("click", async () => {
  const otp = [...document.querySelectorAll("#otp-inputs input")].map((input) => input.value).join("");
  const registration = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  const error = document.getElementById("otp-error");
  const button = document.getElementById("btn-verify");
  error.textContent = "";

  if (otp.length !== 6) { error.textContent = "กรุณากรอก OTP ให้ครบ 6 หลัก"; return; }
  if (!registration) {
    error.textContent = "ไม่พบข้อมูลการลงทะเบียน กรุณาเริ่มใหม่";
    goToScreen("screen-register", 1);
    return;
  }

  button.disabled = true;
  button.textContent = "กำลังตรวจสอบ...";

  try {
    const data = await requestApi({ action: "verifyOTP", studentId: registration.studentId, otp, deviceId: registration.deviceId });
    if (!data.success) throw new Error(data.message || "OTP ไม่ถูกต้อง");
  } catch (err) {
    error.textContent = `ยืนยันไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`;
    button.disabled = false;
    button.textContent = "ยืนยัน";
    return;
  }

  let doorError = "";
  try {
    await openDoor(registration.room);
  } catch (err) {
    doorError = err.message || "สั่งเปิดประตูไม่สำเร็จ";
  }

  clearRememberedData();
  sessionStorage.removeItem(SESSION_KEY);
  const deviceRemembered = document.getElementById("device-remembered");
  if (deviceRemembered) deviceRemembered.style.display = "none";
  goToScreen("screen-success", 3);
  if (doorError) {
    setStatus(`ยืนยันตัวตนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${doorError}`, "error");
  } else {
    setStatus();
  }
  button.disabled = false;
  button.textContent = "ยืนยัน";
});

document.getElementById("btn-resend").addEventListener("click", async (event) => {
  event.preventDefault();
  const registration = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  const error = document.getElementById("otp-error");
  if (!registration) {
    error.textContent = "ไม่พบข้อมูล กรุณากรอกข้อมูลใหม่";
    goToScreen("screen-register", 1);
    return;
  }
  try {
    error.textContent = "กำลังส่ง OTP ใหม่...";
    const data = await requestApi({ action: "register", ...registration });
    if (!data.success) throw new Error(data.message || "ส่ง OTP ไม่สำเร็จ");
    error.textContent = "ส่ง OTP ใหม่แล้ว กรุณาตรวจสอบอีเมล";
  } catch (err) {
    error.textContent = `ส่ง OTP ไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`;
  }
});

document.getElementById("btn-continue").addEventListener("click", () => {
  clearForm();
  sessionStorage.removeItem(SESSION_KEY);
  goToScreen("screen-register", 1);
});
