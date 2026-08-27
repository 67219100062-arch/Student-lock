// ======================================================
// CONFIG
// ======================================================

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby12Upaf4pxs6yZf27Iz2hgmjWRQXK5EBT6FrgtlH1mK7LVH4-ZNGU6pXM27xBXbjny/exec";

const FIREBASE_HOST =
  "https://tan-is-man-default-rtdb.asia-southeast1.firebasedatabase.app";


// ======================================================
// STORAGE
// ======================================================

const SESSION_KEY = "pendingRegistration";

const REMEMBER_DAYS = 30;

const REMEMBER_DATA_KEY = "rememberedData";

const REMEMBER_UNTIL_KEY = "rememberedUntil";

const DEVICE_ID_KEY = "deviceId";


// ======================================================
// API SETTINGS
// ======================================================

// ป้องกัน API ค้างนานเกินไป
const API_TIMEOUT = 15000;

const FIREBASE_TIMEOUT = 8000;


// ======================================================
// GET DEVICE ID
// ======================================================

function getDeviceId() {

  let id = localStorage.getItem(DEVICE_ID_KEY);

  if (!id) {

    id =
      `dev-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
}


// ======================================================
// STATUS
// ======================================================

function setStatus(message = "", type = "") {

  const status =
    document.getElementById("connection-status");

  if (!status) return;

  status.textContent = message;

  status.className =
    `connection-status${type ? ` is-${type}` : ""}`;
}


// ======================================================
// CHANGE SCREEN
// ======================================================

function goToScreen(screenId, step) {

  document.querySelectorAll(".screen").forEach((screen) => {

    screen.classList.remove("active");

  });


  const target =
    document.getElementById(screenId);

  if (target) {

    target.classList.add("active");

  }


  document.querySelectorAll(".dot").forEach((dot, index) => {

    dot.classList.toggle(
      "done",
      index < step
    );

  });

}


// ======================================================
// API REQUEST
// ======================================================

async function requestApi(payload) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      API_TIMEOUT
    );


  try {

    const params =
      new URLSearchParams({

        data: JSON.stringify(payload)

      });


    const response =
      await fetch(
        `${APPS_SCRIPT_URL}?${params.toString()}`,
        {
          method: "GET",
          redirect: "follow",
          cache: "no-store",
          signal: controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `เซิร์ฟเวอร์ตอบกลับ ${response.status}`
      );

    }


    const text =
      await response.text();


    try {

      return JSON.parse(text);

    } catch {

      console.error(
        "API response:",
        text
      );

      throw new Error(
        "เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง"
      );

    }

  } catch (error) {

    if (error.name === "AbortError") {

      throw new Error(
        "เซิร์ฟเวอร์ตอบกลับช้าเกินไป กรุณาลองใหม่"
      );

    }

    throw error;

  } finally {

    clearTimeout(timeout);

  }

}


// ======================================================
// FIREBASE OPEN DOOR
// ======================================================

async function openDoor(room) {

  const roomKey =
    String(room)
      .trim()
      .replace("/", "_");


  const url =
    `${FIREBASE_HOST}/door/${roomKey}/command.json`;


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      FIREBASE_TIMEOUT
    );


  try {

    const response =
      await fetch(
        url,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(true),

          cache: "no-store",

          signal: controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `Firebase returned ${response.status}`
      );

    }

    return true;

  } catch (error) {

    if (error.name === "AbortError") {

      throw new Error(
        "เชื่อมต่อระบบประตูช้าเกินไป"
      );

    }

    throw error;

  } finally {

    clearTimeout(timeout);

  }

}


// ======================================================
// CLEAR FORM
// ======================================================

function clearForm() {

  [
    "reg-email",
    "reg-name",
    "reg-id",
    "reg-room"
  ].forEach((id) => {

    const element =
      document.getElementById(id);

    if (element) {

      element.value = "";

    }

  });


  document
    .querySelectorAll("#otp-inputs input")
    .forEach((input) => {

      input.value = "";

    });


  const remember =
    document.getElementById(
      "remember-device"
    );

  if (remember) {

    remember.checked = false;

  }


  const registerError =
    document.getElementById(
      "register-error"
    );

  if (registerError) {

    registerError.textContent = "";

  }


  const otpError =
    document.getElementById(
      "otp-error"
    );

  if (otpError) {

    otpError.textContent = "";

  }


  setStatus();

}


// ======================================================
// REMEMBERED DATA
// ======================================================

function getRememberedData() {

  const rememberedUntil =
    Number(
      localStorage.getItem(
        REMEMBER_UNTIL_KEY
      )
    );


  if (!rememberedUntil) {

    return null;

  }


  if (rememberedUntil <= Date.now()) {

    clearRememberedData();

    return null;

  }


  try {

    const data =
      JSON.parse(
        localStorage.getItem(
          REMEMBER_DATA_KEY
        ) || "null"
      );


    if (
      !data ||
      !data.email ||
      !data.name ||
      !data.studentId ||
      !data.room ||
      !data.deviceId
    ) {

      return null;

    }


    return data;

  } catch {

    return null;

  }

}


// ======================================================
// SAVE REMEMBERED DATA
// ======================================================

function saveRememberedData(registration) {

  localStorage.setItem(
    REMEMBER_DATA_KEY,
    JSON.stringify(registration)
  );


  localStorage.setItem(
    REMEMBER_UNTIL_KEY,
    String(
      Date.now() +
      REMEMBER_DAYS * 86400000
    )
  );

}


// ======================================================
// CLEAR REMEMBERED DATA
// ======================================================

function clearRememberedData() {

  localStorage.removeItem(
    REMEMBER_DATA_KEY
  );

  localStorage.removeItem(
    REMEMBER_UNTIL_KEY
  );

}


// ======================================================
// SHOW SUCCESS
// ======================================================

function showSuccess(remembered = false) {

  const deviceRemembered =
    document.getElementById(
      "device-remembered"
    );


  if (deviceRemembered) {

    deviceRemembered.style.display =
      remembered ? "flex" : "none";

  }


  goToScreen(
    "screen-success",
    3
  );

}


// ======================================================
// REGISTER
// ======================================================

async function handleRegister() {

  const email =
    document
      .getElementById("reg-email")
      .value
      .trim();


  const name =
    document
      .getElementById("reg-name")
      .value
      .trim();


  const studentId =
    document
      .getElementById("reg-id")
      .value
      .trim();


  const room =
    document
      .getElementById("reg-room")
      .value
      .trim();


  const deviceId =
    getDeviceId();


  const remember =
    document
      .getElementById("remember-device")
      .checked;


  const error =
    document.getElementById(
      "register-error"
    );


  const button =
    document.getElementById(
      "btn-register"
    );


  error.textContent = "";


  // --------------------------------------------------
  // VALIDATE
  // --------------------------------------------------

  if (
    !email ||
    !name ||
    !studentId ||
    !room
  ) {

    error.textContent =
      "กรุณากรอกข้อมูลให้ครบทุกช่อง";

    return;

  }


  if (
    !email
      .toLowerCase()
      .endsWith("@minburi.ac.th")
  ) {

    error.textContent =
      "กรุณาใช้อีเมล @minburi.ac.th เท่านั้น";

    return;

  }


  const registration = {

    email,
    name,
    studentId,
    room,
    deviceId

  };


  // --------------------------------------------------
  // DISABLE BUTTON
  // --------------------------------------------------

  button.disabled = true;


  try {

    // ==================================================
    // REMEMBER DEVICE
    // ==================================================

    if (remember) {

      button.textContent =
        "กำลังลงทะเบียน...";


      const data =
        await requestApi({

          action: "saveDirectly",

          ...registration

        });


      if (!data.success) {

        throw new Error(
          data.message ||
          "ลงทะเบียนไม่สำเร็จ"
        );

      }


      saveRememberedData(
        registration
      );


      sessionStorage.removeItem(
        SESSION_KEY
      );


      // แสดงหน้าสำเร็จก่อน
      showSuccess(true);


      // ค่อยสั่งเปิดประตู
      try {

        await openDoor(
          registration.room
        );


        setStatus(
          "เปิดประตูเรียบร้อยแล้ว",
          "success"
        );

      } catch (doorError) {

        setStatus(
          `ลงทะเบียนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${
            doorError.message ||
            "กรุณาลองใหม่"
          }`,
          "error"
        );

      }


      return;

    }


    // ==================================================
    // SEND OTP
    // ==================================================

    button.textContent =
      "กำลังส่ง OTP...";


    clearRememberedData();


    const data =
      await requestApi({

        action: "register",

        ...registration

      });


    if (!data.success) {

      throw new Error(
        data.message ||
        "ส่ง OTP ไม่สำเร็จ"
      );

    }


    // บันทึก session
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(registration)
    );


    // แสดงอีเมล
    const emailTarget =
      document.getElementById(
        "otp-email-target"
      );


    if (emailTarget) {

      emailTarget.textContent =
        registration.email;

    }


    // ไปหน้า OTP
    goToScreen(
      "screen-otp",
      2
    );


  } catch (err) {

    error.textContent =
      `ดำเนินการไม่สำเร็จ: ${
        err.message ||
        "กรุณาลองใหม่"
      }`;

  } finally {

    button.disabled = false;

    button.textContent =
      "ลงทะเบียน";

  }

}


// ======================================================
// VERIFY OTP
// ======================================================

async function handleVerifyOTP() {

  const inputs =
    [
      ...document.querySelectorAll(
        "#otp-inputs input"
      )
    ];


  const otp =
    inputs
      .map(
        (input) => input.value
      )
      .join("");


  const registration =
    JSON.parse(
      sessionStorage.getItem(
        SESSION_KEY
      ) || "null"
    );


  const error =
    document.getElementById(
      "otp-error"
    );


  const button =
    document.getElementById(
      "btn-verify"
    );


  error.textContent = "";


  // --------------------------------------------------
  // CHECK OTP
  // --------------------------------------------------

  if (otp.length !== 6) {

    error.textContent =
      "กรุณากรอก OTP ให้ครบ 6 หลัก";

    return;

  }


  if (!registration) {

    error.textContent =
      "ไม่พบข้อมูลการลงทะเบียน กรุณาเริ่มใหม่";

    goToScreen(
      "screen-register",
      1
    );

    return;

  }


  button.disabled = true;

  button.textContent =
    "กำลังตรวจสอบ...";


  try {

    // ==================================================
    // VERIFY OTP
    // ==================================================

    const data =
      await requestApi({

        action: "verifyOTP",

        studentId:
          registration.studentId,

        otp,

        deviceId:
          registration.deviceId

      });


    if (!data.success) {

      throw new Error(
        data.message ||
        "OTP ไม่ถูกต้อง"
      );

    }


    // ==================================================
    // OTP SUCCESS
    // ==================================================

    clearRememberedData();

    sessionStorage.removeItem(
      SESSION_KEY
    );


    // แสดงหน้าสำเร็จทันที
    showSuccess(false);


    // ==================================================
    // OPEN DOOR
    // ==================================================

    try {

      await openDoor(
        registration.room
      );


      setStatus(
        "ยืนยันตัวตนสำเร็จ และเปิดประตูเรียบร้อยแล้ว",
        "success"
      );

    } catch (doorError) {

      setStatus(
        `ยืนยันตัวตนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${
          doorError.message ||
          "กรุณาลองใหม่"
        }`,
        "error"
      );

    }


  } catch (err) {

    error.textContent =
      `ยืนยันไม่สำเร็จ: ${
        err.message ||
        "กรุณาลองใหม่"
      }`;

  } finally {

    button.disabled = false;

    button.textContent =
      "ยืนยัน";

  }

}


// ======================================================
// RESEND OTP
// ======================================================

async function handleResendOTP(event) {

  event.preventDefault();


  const registration =
    JSON.parse(
      sessionStorage.getItem(
        SESSION_KEY
      ) || "null"
    );


  const error =
    document.getElementById(
      "otp-error"
    );


  const button =
    document.getElementById(
      "btn-resend"
    );


  if (!registration) {

    error.textContent =
      "ไม่พบข้อมูล กรุณากรอกข้อมูลใหม่";

    goToScreen(
      "screen-register",
      1
    );

    return;

  }


  button.disabled = true;


  try {

    error.textContent =
      "กำลังส่ง OTP ใหม่...";


    const data =
      await requestApi({

        action: "register",

        ...registration

      });


    if (!data.success) {

      throw new Error(
        data.message ||
        "ส่ง OTP ไม่สำเร็จ"
      );

    }


    error.textContent =
      "ส่ง OTP ใหม่แล้ว กรุณาตรวจสอบอีเมล";


  } catch (err) {

    error.textContent =
      `ส่ง OTP ไม่สำเร็จ: ${
        err.message ||
        "กรุณาลองใหม่"
      }`;

  } finally {

    button.disabled = false;

  }

}


// ======================================================
// OTP INPUT
// ======================================================

function setupOTPInputs() {

  const inputs =
    [
      ...document.querySelectorAll(
        "#otp-inputs input"
      )
    ];


  inputs.forEach(
    (input, index) => {

      // ----------------------------------------------
      // INPUT
      // ----------------------------------------------

      input.addEventListener(
        "input",
        () => {

          input.value =
            input.value
              .replace(/\D/g, "")
              .slice(0, 1);


          if (
            input.value &&
            index < inputs.length - 1
          ) {

            inputs[index + 1].focus();

          }

        }
      );


      // ----------------------------------------------
      // BACKSPACE
      // ----------------------------------------------

      input.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Backspace" &&
            !input.value &&
            index > 0
          ) {

            inputs[index - 1].focus();

          }

        }
      );


      // ----------------------------------------------
      // PASTE OTP
      // ----------------------------------------------

      input.addEventListener(
        "paste",
        (event) => {

          const digits =
            event.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, 6);


          if (!digits) return;


          event.preventDefault();


          digits
            .split("")
            .forEach(
              (digit, offset) => {

                if (
                  inputs[index + offset]
                ) {

                  inputs[
                    index + offset
                  ].value = digit;

                }

              }
            );


          inputs[
            Math.min(
              index + digits.length,
              inputs.length - 1
            )
          ].focus();

        }
      );

    }
  );

}


// ======================================================
// INIT
// ======================================================

function init() {

  // สร้าง Device ID
  getDeviceId();


  // ตั้งหน้าแรกทันที
  goToScreen(
    "screen-register",
    1
  );


  // OTP
  setupOTPInputs();


  // Register
  const registerButton =
    document.getElementById(
      "btn-register"
    );


  if (registerButton) {

    registerButton.addEventListener(
      "click",
      handleRegister
    );

  }


  // Verify
  const verifyButton =
    document.getElementById(
      "btn-verify"
    );


  if (verifyButton) {

    verifyButton.addEventListener(
      "click",
      handleVerifyOTP
    );

  }


  // Resend
  const resendButton =
    document.getElementById(
      "btn-resend"
    );


  if (resendButton) {

    resendButton.addEventListener(
      "click",
      handleResendOTP
    );

  }


  // Continue
  const continueButton =
    document.getElementById(
      "btn-continue"
    );


  if (continueButton) {

    continueButton.addEventListener(
      "click",
      () => {

        clearForm();

        sessionStorage.removeItem(
          SESSION_KEY
        );

        goToScreen(
          "screen-register",
          1
        );

      }
    );

  }

}


// ======================================================
// START
// ======================================================

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );

} else {

  init();

}
