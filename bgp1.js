javascript:(async () => {

  /************** 🔧 HÀM TIỆN ÍCH **************/

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

  // Set value giả lập gõ phím
  const setValue = async (xpath, value) => {
    const el = document.evaluate(xpath, document, null, 9, null).singleNodeValue;
    if (!el) return;
    el.focus();
    el.value = "";
    for (let char of value.toString()) {
      el.value += char;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await randomSleep(50, 150);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
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
    await safeClick(el, extraDelay);
  };

  /************** 🟢 BƯỚC 1: SET LEVERAGE **************/
  try {
    const leverageBtn = await waitFor("//span[contains(text(),'Leverage ')]");
    const is11x = document.evaluate("//span[text()='Leverage 11X']", document, null, 9, null).singleNodeValue;

    if (!is11x) {
      await safeClick(leverageBtn);
      await waitFor("//span[text()='25X']");
      await setValue('//span[text()="Leverage"]/../../input', "11");
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

  /************** 🟢 BƯỚC 3: KIỂM TRA LỆNH **************/
  try {
    await clickXpath("//div[text()='Order details']");
    await waitFor("//div[@class='bit-table-body']//tbody");
    await randomSleep();

    const openLong = document.evaluate("//div[@class='bit-table-body']//span[normalize-space(text())='Open long']", document, null, 9, null).singleNodeValue;

    if (!openLong) {
      await clickXpath("//span[contains(text(),'Positions')]");
      await randomSleep();

      try {
        const zeroBalance = document.evaluate("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", document, null, 9, null).singleNodeValue;
        if (zeroBalance) {
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
        console.warn("⚠️ Lỗi bước 3 (Transfer):", e);
        location.reload();
      }

      try {
        await clickXpath("//span[text()='Market']");
        await waitFor("//span[text()='To be executed at the best price']");
        const priceEl = await waitFor('//div[contains(@class,"CurrentPriceDisplay")]/div/span');
        let price = parseFloat(priceEl.textContent.replace(/,/g, "").trim());
        if (isNaN(price)) throw 0;
        price = Math.floor(price);
        const qty = Math.max(0.001, Math.ceil(((2000 / 2) / price) * 1000 - 1e-12) / 1000);
        await setValue('//input[@name="op-amount"]', qty);

        await clickXpath("//span[text()='Open long']");
        await clickXpath("//button[text()='Confirm']");
        await clickXpath("//button[text()='Confirm']");

        await waitFor("//span[text()='Flash close']");
        await clickXpath("//span[text()='Flash close']", true); // chờ 2–3s
        await clickXpath("//button[text()='Confirm']");
        await clickXpath("//button[text()='Confirm']");
      } catch (e) {
        console.error("❌ Lỗi bước 4 (Mở/Đóng lệnh):", e);
      }
    }

  } catch (e) {
    console.error("❌ Lỗi bước 3:", e);
  }

  /************** 🟢 BƯỚC 4: KẾT THÚC **************/
  await randomSleep(1500, 2500);
  try {
    const zeroBalance = document.evaluate("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", document, null, 9, null).singleNodeValue;
    if (zeroBalance) {
      prompt("DONE ✅");
    } else {
      const transferBtn = document.evaluate("//span[contains(text(),'Available')]/../../div/button", document, null, 9, null).singleNodeValue;
      if (transferBtn) await safeClick(transferBtn);

      const allBtn = await waitFor("//span[text()='All']");
      const icon = await waitFor("//div[text()='Transfer']/../div/div/div/i");
      const confirmBtn = await waitFor("//button[text()='Confirm']");

      await safeClick(icon);
      await safeClick(allBtn);
      await safeClick(confirmBtn);

      try {
        await waitFor("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", 2000);
        await randomSleep(800, 1500);
        prompt("DONE ✅");
      } catch {
        location.reload();
      }
    }
  } catch (e) {
    console.error("❌ Lỗi bước 5 (Kết thúc):", e);
  }

})();
