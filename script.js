const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby12Upaf4pxs6yZf27Iz2hgmjWRQXK5EBT6FrgtlH1mK7LVH4-ZNGU6pXM27xBXbjny/exec";

// Firebase Realtime Database
const FIREBASE_HOST =
  "https://tan-is-man-default-rtdb.asia-southeast1.firebasedatabase.app";

const FIREBASE_DOOR_COMMAND_URL =
  `${FIREBASE_HOST}/door/command.json`;

// Session / Remember Device
const SESSION_KEY = "pendingRegistration";
const REMEMBER_DAYS = 30;
const REMEMBER_DATA_KEY = "rememberedData";
const REMEMBER_UNTIL_KEY = "rememberedUntil";


// =====================================================
// DEVICE ID
// =====================================================

function getDeviceId() {
  let id = localStorage.getItem("deviceId");

  if (!id) {
    id = `dev-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    localStorage.setItem("deviceId", id);
  }

  return id;
}


// =====================================================
// STATUS
// =====================================================

function setStatus(message = "", type = "") {
  const status = document.getElementById("connection-status");

  if (!status) return;

  status.textContent = message;

  status.className =
    `connection-status${type ? ` is-${type}` : ""}`;
}


// =====================================================
// เปลี่ยนหน้าจอ
// =====================================================

function goToScreen(screenId, step) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const target = document.getElementById(screenId);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.classList.toggle("done", index < step);
  });
}


// =====================================================
// เรียก Google Apps Script
// =====================================================

async function requestApi(payload) {
  const params = new URLSearchParams({
    data: JSON.stringify(payload)
  });

  const response = await fetch(
    `${APPS_SCRIPT_URL}?${params}`,
    {
      redirect: "follow"
    }
  );

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    console.error("API response:", text);
    throw new Error("เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง");
  }
}


// =====================================================
// เปิดประตูผ่าน Firebase
// =====================================================

async function openDoor() {
  const response = await fetch(
    FIREBASE_DOOR_COMMAND_URL,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(true),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Firebase returned ${response.status}`
    );
  }
}


// =====================================================
// ล้างฟอร์ม
// =====================================================

function clearForm() {
  [
    "reg-email",
    "reg-name",
    "reg-id",
    "reg-room"
  ].forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.value = "";
    }
  });

  document
    .querySelectorAll("#otp-inputs input")
    .forEach((input) => {
      input.value = "";
    });

  const remember = document.getElementById(
    "remember-device"
  );

  if (remember) {
    remember.checked = false;
  }

  const registerError =
    document.getElementById("register-error");

  const otpError =
    document.getElementById("otp-error");

  if (registerError) {
    registerError.textContent = "";
  }

  if (otpError) {
    otpError.textContent = "";
  }

  setStatus();
}


// =====================================================
// ตรวจสอบข้อมูลอุปกรณ์ที่เคยจำไว้
// =====================================================

function getRememberedData() {
  const rememberedUntil =
    Number(
      localStorage.getItem(REMEMBER_UNTIL_KEY)
    );

  // ไม่มีวันหมดอายุ
  if (!rememberedUntil) {
    return null;
  }

  // หมดอายุแล้ว
  if (rememberedUntil <= Date.now()) {
    clearRememberedData();
    return null;
  }

  try {
    const data = JSON.parse(
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


// =====================================================
// บันทึกอุปกรณ์ 30 วัน
// =====================================================

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

  console.log(
    "[remember] บันทึกอุปกรณ์ไว้ 30 วัน"
  );
}


// =====================================================
// ลบข้อมูลอุปกรณ์ที่จำไว้
// =====================================================

function clearRememberedData() {
  localStorage.removeItem(
    REMEMBER_DATA_KEY
  );

  localStorage.removeItem(
    REMEMBER_UNTIL_KEY
  );

  console.log(
    "[remember] ลบข้อมูลอุปกรณ์ที่จำไว้แล้ว"
  );
}


// =====================================================
// เปิดเว็บ
// ไม่มี Auto Login
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    // สร้าง Device ID ถ้ายังไม่มี
    getDeviceId();

    console.log(
      "[system] เปิดหน้าเว็บแล้ว"
    );

    console.log(
      "[system] ไม่มี Auto Login"
    );

    // บังคับให้เริ่มที่หน้าลงทะเบียน
    goToScreen(
      "screen-register",
      1
    );
  }
);


// =====================================================
// OTP INPUT
// =====================================================

document
  .querySelectorAll("#otp-inputs input")
  .forEach((input, index, inputs) => {

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
          .forEach((digit, offset) => {

            if (
              inputs[index + offset]
            ) {
              inputs[index + offset].value =
                digit;
            }
          });

        inputs[
          Math.min(
            index + digits.length,
            inputs.length - 1
          )
        ].focus();
      }
    );
  });


// =====================================================
// ปุ่มลงทะเบียน
// =====================================================

document
  .getElementById("btn-register")
  .addEventListener(
    "click",
    async () => {

      const registration = {

        email:
          document
            .getElementById("reg-email")
            .value
            .trim(),

        name:
          document
            .getElementById("reg-name")
            .value
            .trim(),

        studentId:
          document
            .getElementById("reg-id")
            .value
            .trim(),

        room:
          document
            .getElementById("reg-room")
            .value
            .trim(),

        deviceId:
          getDeviceId()
      };


      const remember =
        document
          .getElementById(
            "remember-device"
          )
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


      // =================================================
      // ตรวจสอบข้อมูล
      // =================================================

      if (
        Object.values(registration)
          .some(
            (value) => !value
          )
      ) {

        error.textContent =
          "กรุณากรอกข้อมูลให้ครบทุกช่อง";

        return;
      }


      // ตรวจสอบ Email
      if (
        !registration.email
          .toLowerCase()
          .endsWith("@minburi.ac.th")
      ) {

        error.textContent =
          "กรุณาใช้อีเมล @minburi.ac.th เท่านั้น";

        return;
      }


      button.disabled = true;


      try {

        // =================================================
        // CASE 1
        // ติ๊กจดจำอุปกรณ์
        // =================================================

        if (remember) {

          button.textContent =
            "กำลังลงทะเบียน...";


          console.log(
            "[register] ติ๊กจดจำอุปกรณ์"
          );


          console.log(
            "[register] เรียก saveDirectly..."
          );


          const data =
            await requestApi({

              action:
                "saveDirectly",

              ...registration

            });


          console.log(
            "[register] ผลลัพธ์ saveDirectly:",
            data
          );


          if (!data.success) {

            throw new Error(
              data.message ||
              "ลงทะเบียนไม่สำเร็จ"
            );
          }


          // บันทึกอุปกรณ์ 30 วัน
          saveRememberedData(
            registration
          );


          // ล้าง session
          sessionStorage.removeItem(
            SESSION_KEY
          );


          // แสดง Success
          const deviceRemembered =
            document.getElementById(
              "device-remembered"
            );


          if (deviceRemembered) {
            deviceRemembered.style.display =
              "flex";
          }


          goToScreen(
            "screen-success",
            3
          );


          console.log(
            "[register] ลงทะเบียนสำเร็จทันที"
          );


          // เปิดประตู
          try {

            await openDoor();

            console.log(
              "[door] เปิดประตูสำเร็จ"
            );

          } catch (err) {

            console.error(
              "[door] เปิดประตูไม่สำเร็จ:",
              err
            );

            setStatus(
              `ลงทะเบียนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${
                err.message ||
                "กรุณาลองใหม่"
              }`,
              "error"
            );
          }


          return;
        }


        // =================================================
        // CASE 2
        // ไม่ได้ติ๊กจดจำอุปกรณ์
        // =================================================

        button.textContent =
          "กำลังส่ง OTP...";


        console.log(
          "[register] ไม่ได้ติ๊กจดจำอุปกรณ์"
        );


        console.log(
          "[register] กำลังส่ง OTP..."
        );


        // ป้องกันไม่ให้ข้อมูลเก่าค้าง
        clearRememberedData();


        const data =
          await requestApi({

            action:
              "register",

            ...registration

          });


        console.log(
          "[register] ผลลัพธ์ register:",
          data
        );


        if (!data.success) {

          throw new Error(
            data.message ||
            "ส่ง OTP ไม่สำเร็จ"
          );
        }


        // เก็บข้อมูลไว้รอ OTP
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify(
            registration
          )
        );


        document
          .getElementById(
            "otp-email-target"
          )
          .textContent =
          registration.email;


        // ไปหน้า OTP
        goToScreen(
          "screen-otp",
          2
        );


      } catch (err) {

        console.error(
          "[register] เกิดข้อผิดพลาด:",
          err
        );


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
  );


// =====================================================
// ยืนยัน OTP
// =====================================================

document
  .getElementById("btn-verify")
  .addEventListener(
    "click",
    async () => {

      const otp =
        [
          ...document.querySelectorAll(
            "#otp-inputs input"
          )
        ]
          .map(
            (input) =>
              input.value
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


      // ตรวจ OTP
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

        console.log(
          "[OTP] กำลังตรวจสอบ OTP..."
        );


        const data =
          await requestApi({

            action:
              "verifyOTP",

            studentId:
              registration.studentId,

            otp:
              otp,

            deviceId:
              registration.deviceId

          });


        console.log(
          "[OTP] ผลลัพธ์:",
          data
        );


        if (!data.success) {

          throw new Error(
            data.message ||
            "OTP ไม่ถูกต้อง"
          );
        }


      } catch (err) {

        console.error(
          "[OTP] ยืนยันไม่สำเร็จ:",
          err
        );


        error.textContent =
          `ยืนยันไม่สำเร็จ: ${
            err.message ||
            "กรุณาลองใหม่"
          }`;


        button.disabled = false;

        button.textContent =
          "ยืนยัน";

        return;
      }


      // =================================================
      // OTP ถูกต้อง
      // =================================================

      console.log(
        "[OTP] OTP ถูกต้อง"
      );


      let doorError = "";


      // เปิดประตู
      try {

        await openDoor();

        console.log(
          "[door] เปิดประตูสำเร็จ"
        );

      } catch (err) {

        doorError =
          err.message ||
          "สั่งเปิดประตูไม่สำเร็จ";

        console.error(
          "[door] เปิดประตูไม่สำเร็จ:",
          err
        );
      }


      // =================================================
      // หลัง OTP สำเร็จ
      // =================================================

      // ใน Flow ใหม่ checkbox อยู่หน้า Register
      // ดังนั้นตอนนี้ข้อมูลจะถูกลบออกแล้ว
      // เพราะผู้ใช้ไม่ได้เลือกจำอุปกรณ์

      clearRememberedData();


      sessionStorage.removeItem(
        SESSION_KEY
      );


      const deviceRemembered =
        document.getElementById(
          "device-remembered"
        );


      if (deviceRemembered) {

        deviceRemembered.style.display =
          "none";
      }


      // ไปหน้า Success
      goToScreen(
        "screen-success",
        3
      );


      if (doorError) {

        setStatus(
          `ยืนยันตัวตนสำเร็จ แต่สั่งเปิดประตูไม่สำเร็จ: ${doorError}`,
          "error"
        );

      } else {

        setStatus();
      }


      button.disabled = false;

      button.textContent =
        "ยืนยัน";

    }
  );


// =====================================================
// ส่ง OTP อีกครั้ง
// =====================================================

document
  .getElementById("btn-resend")
  .addEventListener(
    "click",
    async (event) => {

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


      if (!registration) {

        error.textContent =
          "ไม่พบข้อมูล กรุณากรอกข้อมูลใหม่";

        goToScreen(
          "screen-register",
          1
        );

        return;
      }


      try {

        error.textContent =
          "กำลังส่ง OTP ใหม่...";


        const data =
          await requestApi({

            action:
              "register",

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
      }

    }
  );


// =====================================================
// ปุ่มเข้าสู่ระบบ / กลับมาเริ่มใหม่
// =====================================================

document
  .getElementById("btn-continue")
  .addEventListener(
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


// =====================================================
// Debug
// =====================================================

console.log(
  "[system] script.js โหลดเรียบร้อย"
);

console.log(
  "[system] Auto Login ถูกปิดแล้ว"
);
