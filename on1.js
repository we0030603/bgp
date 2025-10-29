(async () => {

  /************** 🔧 HÀM TIỆN ÍCH **************/
  const LEVERAGE = 25; // 👈 chỉnh tại đây nếu cần

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomSleep = (min = 50, max = 100) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

  const simulateMouseMove = async (targetEl, steps = 5) => {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    let x = Math.floor(window.innerWidth * Math.random());
    let y = Math.floor(window.innerHeight * Math.random());
    for (let i = 0; i < steps; i++) {
      x += Math.floor((rect.x + rect.width / 2 - x) / (steps - i));
      y += Math.floor((rect.y + rect.height / 2 - y) / (steps - i));
      document.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        clientX: x,
        clientY: y,
        movementX: Math.floor(Math.random() * 5),
        movementY: Math.floor(Math.random() * 5),
        view: window
      }));
      await randomSleep(30, 80);
    }
  };

  const setValue = async (xpath, value) => {
    const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!el) return console.error("❌ Không tìm thấy input:", xpath);

    el.focus();
    await randomSleep(150, 400);
    const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (nativeSetter) nativeSetter.call(el, "");
    else el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));

    for (let char of value.toString()) {
      const current = el.value + char;
      if (nativeSetter) nativeSetter.call(el, current);
      else el.value = current;
      try {
        el.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, data: char, inputType: "insertText" }));
      } catch {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
      await randomSleep(30, 70);
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("⌨️ Gõ:", value, "→", xpath);
  };

  const safeClick = async (el, extraDelay = false) => {
    if (!el) return;
    await randomSleep(100, 150);
    if (extraDelay) await randomSleep(200, 300);
    await simulateMouseMove(el, 6);
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: rect.x + 5, clientY: rect.y + 5 }));
    el.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.x + Math.floor(rect.width / 2),
      clientY: rect.y + Math.floor(rect.height / 2)
    }));
  };

  const waitFor = (xpath, timeout = 4000) => new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (el) return resolve(el);
      if (Date.now() - start > timeout) {
        console.warn("⏰ Timeout:", xpath);
        return reject();
      }
      setTimeout(check, 200);
    })();
  });

  const clickXpath = async (xpath, extraDelay = false) => {
    const el = await waitFor(xpath);
    await randomSleep(100, 150);
    await safeClick(el, extraDelay);
  };


  /************** 🚀 CHƯƠNG TRÌNH CHÍNH **************/
  console.log("🚀 Bắt đầu quy trình Future 20k...");

  while (true) {
    try {
      // 1️⃣ ĐỢI INPUT KHÔNG BỊ DISABLED
      await waitFor("//input[not(@disabled)]");

      // 2️⃣ KIỂM TRA & CÀI ĐÒN BẨY
      const leverageBtn = document.evaluate(`//button[text()='${LEVERAGE}x']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (!leverageBtn) {
        console.log("⚙️ Chưa đúng đòn bẩy — tiến hành thay đổi...");
        await clickXpath("//button[contains(text(),'x')]");
        await waitFor("//input[contains(@value,'x')]");
        await setValue("//input[contains(@value,'x')]", LEVERAGE);
        await clickXpath("//button[text()='Xác nhận']");
        await waitFor("//div[text()='Đã tiếp nhận yêu cầu thay đổi đòn bẩy']");
        console.log(`✅ Đã đổi đòn bẩy thành công: ${LEVERAGE}x`);
      }

      // 3️⃣ LẤY GIÁ TRỊ TỐI ĐA
      const maxTextEl = document.evaluate("//div[normalize-space(text())='Tối đa']/../div[2]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (!maxTextEl) throw new Error("Không tìm thấy phần tử 'Tối đa'");
      const x = parseFloat(maxTextEl.textContent.replace(/[^\d.]/g, ""));
      console.log("💰 Giá trị tối đa:", x);

      // 4️⃣ THAO TÁC ĐẶT LỆNH
      const amount = Math.floor(x * 0.97);
      console.log("🧮 Đặt lệnh với giá trị:", amount);

      await setValue("//input[not(@disabled)]", amount);
      await sleep(50);
      await clickXpath("//button[text()='Đặt lệnh mua']");

      try {
        await waitFor("//input[@class='form-checkbox'] | //div[text()='Đã tiếp nhận yêu cầu đặt lệnh']", 13000);
        const checkbox = document.evaluate("//input[@class='form-checkbox']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (checkbox) {
          console.log("☑️ Xác nhận đặt lệnh...");
          await clickXpath("//input[@class='form-checkbox']");
          await sleep(100);
          await clickXpath("//button[text()='Xác nhận']");
        } else {
          console.log("✅ Đã tiếp nhận yêu cầu đặt lệnh.");
        }
      } catch {
        console.warn("⚠️ Không thấy xác nhận đơn hàng, bỏ qua.");
      }

      // 5️⃣ ĐÓNG & XÁC NHẬN
      await clickXpath("//button[text()='Đóng']");
      await clickXpath("//button[text()='Xác nhận']");

      // 🕒 NGHỈ 5 GIÂY TRƯỚC KHI TIẾP TỤC
      const delay = Math.floor(Math.random() * (10000 - 7000 + 1)) + 7000;
      console.log(`⏳ Nghỉ ${delay}ms để tránh spam request...`);
      await sleep(delay);

      // 6️⃣ KIỂM TRA DỪNG
      if (x < 70000) {
        console.log("🎯 Hoàn tất đặt lệnh final. Dừng script.");
        break;
      }

      console.log(`🔁 x (${x}) vẫn > 70000 → tiếp tục vòng lặp...`);

    } catch (err) {
      console.error("❌ Lỗi trong quy trình:", err);
      await sleep(1000);
    }
  }

  console.log("🏁 Script kết thúc an toàn.");
  prompt("DONE ✅");
})();
