(async () => {

  /************** 🔧 HÀM TIỆN ÍCH **************/
/************** Future 20k **************/
  // 🧩 Cấu hình chung
  const LEVERAGE = 52; // 👈 chỉ cần đổi số này (vd: 13, 55)

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomSleep = (min = 100, max = 800) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

  // Giả lập rê chuột ngẫu nhiên tới phần tử
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
      await randomSleep(30, 120);
    }
  };

  // Set value giả lập gõ phím (an toàn, giống người gõ)
  const setValue = async (xpath, value) => {
    const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!el) {
      console.error("❌ Không tìm thấy input:", xpath);
      return;
    }
    el.focus();
    await randomSleep(800, 1200);
    const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (nativeSetter) nativeSetter.call(el, "");
    else el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));

    for (let char of value.toString()) {
      const current = el.value + char;
      if (nativeSetter) nativeSetter.call(el, current);
      else el.value = current;
      try {
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true,
          composed: true,
          data: char,
          inputType: "insertText"
        }));
      } catch {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
      await randomSleep(100, 200);
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("⌨️ Gõ:", value, "→", xpath);
  };

  // Click an toàn (rê chuột trước khi click)
  const safeClick = async (el, extraDelay = false) => {
    if (!el) return;
    await randomSleep(200, 600);
    if (extraDelay) await randomSleep(2000, 3000);
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

  // Chờ element theo XPath
  const waitFor = (xpath, timeout = 10000) => new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (el) return resolve(el);
      if (Date.now() - start > timeout) {
        console.warn("⏰ Timeout:", xpath);
        location.reload();
        return reject();
      }
      setTimeout(check, 200);
    })();
  });

  // Chờ element và click an toàn
  const clickXpath = async (xpath, extraDelay = false) => {
    const el = await waitFor(xpath);
    await randomSleep(800, 1200);
    await safeClick(el, extraDelay);
  };
    const clickXpath1 = async (xpath, extraDelay = false) => {
    const el1 = await waitFor(xpath);
    await randomSleep(100, 200);
    await safeClick(el1);
  };

  /************** 🟡 KIỂM TRA FLASH CLOSE NGAY KHI BẮT ĐẦU **************/
  (async () => {
    console.log("⏳ Đang theo dõi Flash close...");
    const flashInterval = setInterval(async () => {
      const flashCloseBtn = document.evaluate("//span[text()='Flash close']", document, null, 9, null).singleNodeValue;
      if (flashCloseBtn) {
        console.log("⚡ Tìm thấy Flash close — click ngay!");
        clearInterval(flashInterval);
      }
    }, 1000);
  })();

  /************** 🟢 BƯỚC 1: SET LEVERAGE **************/
  try {
    const leverageBtn = await waitFor("//span[contains(text(),'Leverage ')]");
    const already11x = document.evaluate(`//span[text()='Leverage ${LEVERAGE}X']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (already11x) {
      console.log(`✅ Đòn bẩy đã là ${LEVERAGE}X — bỏ qua`);
    } else {
      await safeClick(leverageBtn);
      await waitFor("//span[text()='25X']");
      await setValue(`//span[text()='Leverage']/../../input`, LEVERAGE.toString());
      await clickXpath("//button[text()='Confirm']");
      try {
        await waitFor("//span[text()='Editing successful']", 5000);
      } catch {
        location.reload();
      }
    }
    await randomSleep(500, 1200);
  } catch (e) {
    console.error("❌ Lỗi bước 1 (Leverage):", e);
  }

  /************** 🟢 BƯỚC 2: FLASH CLOSE **************/
  try {
    const flashCloseBtn = document.evaluate("//span[text()='Flash close']", document, null, 9, null).singleNodeValue;
    if (flashCloseBtn) {
      // chờ 2–3 giây trước khi bấm
      await safeClick(flashCloseBtn, true);
      let confirmBtn, start = Date.now();
      while (!(confirmBtn = document.evaluate("//button[text()='Confirm']", document, null, 9, null).singleNodeValue) && Date.now() - start < 10000) {
        await sleep(100);
      }
      confirmBtn && await safeClick(confirmBtn);
    }
  } catch (e) {
    console.error("❌ Lỗi bước 2 (Flash Close):", e);
  }

  /************** 🟢 BƯỚC 3: KIỂM TRA LỆNH (LẶP) + SPOT => Future **************/
while (true) {
  try {
    console.log("🔁 (Vòng lặp) Kiểm tra Position history...");
    await clickXpath("//div[text()='Position history']");
    await waitFor("//div[@class='bit-table-body']//tbody");
    await randomSleep(2000,2100);

    const openLong = document.evaluate("(//tr[not(@aria-hidden)]/td[5]/span)[3]", document, null, 9, null).singleNodeValue;

    if (openLong) {
      console.log("✅ Đã phát hiện lệnh mở — thoát vòng lặp.");
      break; // dừng chỉ vòng lặp 3+4, tiếp tục phần KẾT THÚC bên dưới
    }

    console.log("⚠️ Chưa thấy lệnh — thực hiện SPOT => Future và mở/đóng lệnh...");

    /************** 🟢 SPOT => Future (mở lệnh) **************/
    try {
      const zeroBalance = document.evaluate("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", document, null, 9, null).singleNodeValue;
      if (zeroBalance) {
        // click nút transfer (nút cha cha->div button như cũ)
        await safeClick(zeroBalance.parentElement.parentElement.querySelector("div button"));
        const [allBtn, confirmBtn] = await Promise.all([
          waitFor("//span[text()='All']"),
          waitFor("//button[text()='Confirm']")
        ]);
        await safeClick(allBtn);
        await safeClick(confirmBtn);
        await waitFor("//span[text()='Successful transfer']", 10000);
        await randomSleep(1500, 2500);
      }
    } catch (e) {
      console.warn("⚠️ Lỗi khi transfer (SPOT→Future):", e);
      // nếu transfer lỗi thì reload để làm mới trạng thái
      location.reload();
      return;
    }

    try {
      await clickXpath("//span[text()='Market']");
      await waitFor("//span[text()='To be executed at the best price']");
      
      await clickXpath("//span[text()='100%']");
      await clickXpath("//span[text()='Open long']");
      
      // Chờ Confirm hoặc Flash close xuất hiện
      const confirmOrFlash = await waitFor("//button[text()='Confirm'] | //span[text()='Flash close']", 10000);
      
      if (confirmOrFlash && confirmOrFlash.textContent.trim() === "Confirm") {
        console.log("🟢 Cần Confirm — bật setting trước khi Confirm");
        await clickXpath("//p[@id='open-setting']/../../span/input");
        await randomSleep(500, 1000);
        await clickXpath("//button[text()='Confirm']");
        await waitFor("//span[text()='Flash close']", 5000);
        console.log("✅ Đã mở lệnh — Flash close hiện");
      } else {
        console.log("⚡ Flash close đã xuất hiện ngay — bỏ qua Confirm");
      }

      await waitFor("//span[text()='Flash close']");
      await clickXpath("//span[text()='Flash close']"); // chờ 2–3s rồi click
      
      // Theo dõi tối đa 5 giây — nếu Flash close biến mất thì coi là đóng thành công
      let disappeared = false;
      for (let i = 0; i < 10; i++) { // 10 * 500ms = 5s
        const stillFlash = document.evaluate("//span[text()='Flash close']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (!stillFlash) {
          disappeared = true;
          console.log("✅ Flash close biến mất — lệnh đã đóng.");
          break;
        }
        await sleep(500);
      }
      
      if (!disappeared) {
        console.warn("⚠️ Flash close vẫn còn sau 5s — reload trang để thử lại.");
        location.reload();
        return;
      }
    } catch (e) {
      console.error("❌ Lỗi khi mở/đóng lệnh trong vòng lặp:", e);
      // để an toàn, chờ 1 khoảng rồi tiếp tục vòng sau (không reload ngay)
    }

    // Delay trước khi lặp lại để tránh spam
    const delayMs = Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;
    console.log(`🔁 Chờ ${Math.round(delayMs/1000)}s trước khi kiểm tra lại...`);
    await sleep(delayMs);

  } catch (err) {
    console.error("❌ Lỗi không mong muốn trong vòng lặp 3+4:", err);
    await randomSleep(5000, 8000);
  }
}

// sau khi break khỏi vòng lặp, code sẽ tiếp tục vào phần KẾT THÚC bên dưới

  /************** 🟢 BƯỚC 4: KẾT THÚC **************/
  await randomSleep(1500, 2500);
  try {
    const zeroBalance = document.evaluate("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", document, null, 9, null).singleNodeValue;
    if (zeroBalance) {
      alert("DONE ✅");
    } else {
      const transferBtn = document.evaluate("//span[contains(text(),'Available')]/../../div/button", document, null, 9, null).singleNodeValue;
      if (transferBtn) await safeClick(transferBtn);

      const allBtn = await waitFor("//span[text()='All']");
      const icon = await waitFor("//div[text()='Transfer']/../div/div/div/i");
      const confirmBtn = await waitFor("//button[text()='Confirm']");

      await safeClick(icon);
      await randomSleep(800, 1200);
      await safeClick(allBtn);
      await safeClick(confirmBtn);

      try {
        await waitFor("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", 2000);
        await randomSleep(800, 1500);
        alert("DONE ✅");
      } catch {
        location.reload();
      }
    }
  } catch (e) {
    console.error("❌ Lỗi bước 5 (Kết thúc):", e);
  }

})();
