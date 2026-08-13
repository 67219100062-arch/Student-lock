const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4x4-URycK462OEKfoHX7PEFK0rp72KI6aQSezOnukLgFqQGENv2us04bJeHPtrq73/exec";
// URL ของ Firebase Realtime Database (ไม่ต้องมี / ปิดท้าย)
const FIREBASE_HOST = "https://tan-is-man-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_DOOR_COMMAND_URL = `${FIREBASE_HOST}/door/command.json`;
const SESSION_KEY = "pendingRegistration";
const REMEMBER_DAYS = 30;
// key ใหม่สำหรับเก็บข้อมูลจดจำอุปกรณ์แบบเต็ม (แทน rememberedEmail เดิม)
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
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  document.querySelectorAll(".dot").forEach((dot, index) => dot.classList.toggle("done", index < step));
}

async function requestApi(payload) {
  const params = new URLSearchParams({
    data: JSON.stringify(payload)
  });
  const response = await fetch(`${APPS_SCRIPT_URL}?${params}`, {
    redirect: "follow"
  });
  const text = await response.text();
  try { return JSON.parse(text); } catch { throw new Error("Invalid JSON"); }
}

async function openDoor() {
  // เขียนคำสั่ง "เปิดประตู" ลง Firebase Realtime Database
  // ESP32 จะ poll ค่านี้อยู่ตลอด แล้วเปิดประตูเองเมื่อเห็นค่าเป็น true
  // วิธีนี้ใช้ได้ไม่ว่าผู้ใช้จะอยู่เน็ตวงไหนก็ตาม เพราะไม่ได้ยิงตรงหา ESP32 อีกต่อไป
  const response = await fetch(FIREBASE_DOOR_COMMAND_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Firebase returned ${response.status}`);
}

function clearForm() {
  ["reg-email", "reg-name", "reg-id", "reg-room"].forEach((id) => { document.getElementById(id).value = ""; });
  document.querySelectorAll("#otp-inputs input").forEach((input) => { input.value = ""; });
  document.getElementById("register-error").textContent = "";
  document.getElementById("otp-error").textContent = "";
  setStatus();
}

// อ่านข้อมูลอุปกรณ์ที่จดจำไว้ (ถ้ามีและยังไม่หมดอายุ)
function getRememberedData() {
  const rememberedUntil = Number(localStorage.getItem(REMEMBER_UNTIL_KEY));
  if (!rememberedUntil || rememberedUntil <= Date.now()) return null;
  try {
    const data = JSON.parse(localStorage.getItem(REMEMBER_DATA_KEY) || "null");
    if (!data || !data.email || !data.name || !data.studentId || !data.room || !data.deviceId) return null;
    return data;
  } catch {
    return null;
  }
}

function saveRememberedData(registration) {
  localStorage.setItem(REMEMBER_DATA_KEY, JSON.stringify(registration));
  localStorage.setItem(REMEMBER_UNTIL_KEY, String(Date.now() + REMEMBER_DAYS * 86400000));
}

function clearRememberedData() {
  localStorage.removeItem(REMEMBER_DATA_KEY);
  localStorage.removeItem(REMEMBER_UNTIL_KEY);
}

// พยายามเข้าสู่ระบบอัตโนมัติด้วยข้อมูลที่จดจำไว้ ข้ามหน้ากรอกฟอร์มและ OTP
// คืนค่า true ถ้าสำเร็จ (พาไปหน้าสำเร็จแล้ว), false ถ้าไม่สำเร็จ/ไม่มีข้อมูลจดจำ
async function tryAutoLogin() {
  const deviceId = getDeviceId();
  const remembered = getRememberedData();
  console.log("[autoLogin] deviceId:", deviceId);
  console.log("[autoLogin] remembered data:", remembered);
  console.log("[autoLogin] rememberedUntil raw:", localStorage.getItem(REMEMBER_UNTIL_KEY));

  if (!remembered) {
    console.log("[autoLogin] ไม่มีข้อมูลจดจำไว้ หรือหมดอายุแล้ว -> ข้าม auto-login");
    return false;
  }
  if (remembered.deviceId !== deviceId) {
    console.log("[autoLogin] deviceId ไม่ตรงกัน -> ข้าม auto-login", remembered.deviceId, "!=", deviceId);
    return false;
  }

  setStatus("กำลังเข้าสู่ระบบอัตโนมัติ...", "");
  try {
    console.log("[autoLogin] กำลังเรียก saveDirectly ...");
    const data = await requestApi({ action: "saveDirectly", ...remembered });
    console.log("[autoLogin] ผลลัพธ์จาก saveDirectly:", data);
    if (!data.success) {
      console.warn("[autoLogin] saveDirectly ไม่สำเร็จ -> ล้างข้อมูลจดจำ แล้วกลับไปกรอกฟอร์มใหม่");
      clearRememberedData();
      setStatus();
      return false;
    }
    console.log("[autoLogin] สำเร็จ! กำลังพาไปหน้า success");
    document.getElementById("device-remembered").style.display = "none";
    goToScreen("screen-success", 3);
    setStatus();

    // สั่งเปิดประตูเช่นเดียวกับตอนยืนยัน OTP ปกติ
    try {
      await openDoor();
    } catch (err) {
      setStatus(`เข้าสู่ระบบสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`, "error");
    }
    return true;
  } catch (err) {
    console.error("[autoLogin] เกิด error ตอนเรียก API:", err);
    // เชื่อมต่อไม่สำเร็จ (เช่นไม่มีอินเทอร์เน็ต) ให้กรอกฟอร์มใหม่ตามปกติแทน ไม่ลบข้อมูลที่จดจำไว้
    setStatus();
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  getDeviceId();

  const loggedInAutomatically = await tryAutoLogin();
  if (loggedInAutomatically) return;

  const remembered = getRememberedData();
  if (remembered && remembered.email) {
    document.getElementById("reg-email").value = remembered.email;
  }
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
    digits.split("").forEach((digit, offset) => { if (inputs[index + offset]) inputs[index + offset].value = digit; });
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
  const error = document.getElementById("register-error");
  const button = document.getElementById("btn-register");
  error.textContent = "";
  if (Object.values(registration).some((value) => !value)) { error.textContent = "กรุณากรอกข้อมูลให้ครบทุกช่อง"; return; }
  if (!registration.email.toLowerCase().endsWith("@minburi.ac.th")) { error.textContent = "กรุณาใช้อีเมล @minburi.ac.th เท่านั้น"; return; }

  button.disabled = true;
  button.textContent = "กำลังเชื่อมต่อ...";
  try {
    const data = await requestApi({ action: "register", ...registration });
    if (!data.success) throw new Error(data.message || "ส่ง OTP ไม่สำเร็จ");
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(registration));
    document.getElementById("otp-email-target").textContent = registration.email;
    goToScreen("screen-otp", 2);
  } catch (err) {
    error.textContent = `เชื่อมต่อไม่สำเร็จ: ${err.message || "กรุณาลองใหม่"}`;
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
  if (!registration) { error.textContent = "ไม่พบข้อมูลการลงทะเบียน กรุณาเริ่มใหม่"; goToScreen("screen-register", 1); return; }

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

  // OTP ถูกต้องแล้ว จากนี้ไปคือขั้นตอนสั่งเปิดประตู แยกออกจาก OTP
  // เพื่อไม่ให้ปัญหาเปิดประตูไม่สำเร็จ ไปทับสถานะ "ยืนยันตัวตนสำเร็จ"
  let doorError = "";
  try {
    await openDoor();
  } catch (err) {
    doorError = err.message || "สั่งเปิดประตูไม่สำเร็จ";
  }

  const remember = document.getElementById("remember-device").checked;
  document.getElementById("device-remembered").style.display = remember ? "flex" : "none";
  if (remember) {
    saveRememberedData(registration);
  } else {
    clearRememberedData();
  }
  sessionStorage.removeItem(SESSION_KEY);
  goToScreen("screen-success", 3);
  if (doorError) {
    setStatus(`ยืนยันตัวตนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${doorError}`, "error");
  }

  button.disabled = false;
  button.textContent = "ยืนยัน";
});

document.getElementById("btn-resend").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("otp-error").textContent = "";
  goToScreen("screen-register", 1);
});

document.getElementById("btn-continue").addEventListener("click", () => {
  clearForm();
  goToScreen("screen-register", 1);
});
// trigger redeploy
