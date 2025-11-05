(async () => {
  try {
    /************************* CẤU HÌNH (chỉnh nếu cần) *************************/
    const minLeverage = 50; // thay đổi nếu cần
    const maxLeverage = 100; // thay đổi nếu cần
    const minVol = 41000; // USDT, khối lượng tối thiểu (ví dụ)
    const maxVol = 41500; // USDT, khối lượng tối đa (ví dụ)
    const feeBuffer = 0.936; // truyền vào calc nếu muốn
    const balanceXPath = "//span[contains(text(),'Available')]/../span[contains(text(),' USDT')]";
    const priceXPath = "//div[contains(@class,'CurrentPriceDisplay')]/div/span";
    const amountInputXPath = "//input[@name='op-amount']";
    const chosenVol = Math.floor(Math.random() * (maxVol - minVol + 1)) + minVol; // USDT mục tiêu
    console.log("🟢 Chosen target volume (USDT):", chosenVol);
    /***************************************************************************/
	/************** 🔧 HÀM TIỆN ÍCH **************/
	const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomSleep = (min = 100, max = 800) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);


function calcBTCFutureVolumeWithTarget(totalVolume, balanceXPath, priceXPath, minLev, maxLev, options) {
  // --- helpers ---
  function getElementByXPath(xpath) {
    try {
      return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    } catch (e) {
      return null;
    }
  }
  function parseNumberText(s) {
    if (s == null) return NaN;
    return parseFloat(String(s).replace(/,/g, '').replace(/[^\d.\-]/g, '').trim());
  }
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // --- options & defaults ---
  options = options || {};
  var optFeeBuffer = (typeof options.feeBuffer === 'number') ? options.feeBuffer : null;
  var minOrderQty = (typeof options.minOrderQty === 'number') ? options.minOrderQty : 0.001; // BTC
  var maxExchangeLeverage = (typeof options.maxLeverage === 'number') ? options.maxLeverage : 125;

  minLev = (typeof minLev === 'number') ? minLev : 75;
  maxLev = (typeof maxLev === 'number') ? maxLev : 100;
  if (maxLev > maxExchangeLeverage) maxLev = maxExchangeLeverage;
  if (minLev < 1) minLev = 1;

  // --- read balance & price from DOM ---
  var balanceEl = getElementByXPath(balanceXPath);
  var priceEl = getElementByXPath(priceXPath);
  if (!balanceEl || !priceEl) {
    console.error("❌ Không tìm thấy phần tử theo XPath (balance hoặc price).");
    return null;
  }
  var balance = parseNumberText(balanceEl.textContent);
  var price = parseNumberText(priceEl.textContent);
  if (!isFinite(balance) || !isFinite(price) || price <= 0) {
    console.error("❌ Giá trị balance hoặc price không hợp lệ:", balanceEl.textContent, priceEl.textContent);
    return null;
  }

  // --- choose leverage randomly ---
  var leverage = randInt(minLev, maxLev);

  // --- determine feeBuffer ---
  // Nếu user truyền feeBuffer thì dùng luôn, ngược lại dùng mặc định đã calibrate từ quan sát bạn cung cấp (~0.937)
  // (Bạn có thể chỉnh giá trị mặc định ở đây nếu muốn)
  var feeBuffer = (optFeeBuffer !== null) ? optFeeBuffer : 0.937; // ~ giảm ~6.3% theo quan sát

  // clamp feeBuffer vào khoảng hợp lý
  if (feeBuffer > 1) feeBuffer = 1;
  if (feeBuffer < 0.3) feeBuffer = 0.3;

  // --- calculations using milli-BTC to avoid float artifacts ---
  var targetVol = totalVolume / 2; // 1 phía

  // continuous maximum BTC available after buffer
  var continuousMaxBTC = (balance * leverage * feeBuffer) / price; // BTC (float)
  var maxMilliBTC = Math.floor(continuousMaxBTC * 1000 + 1e-9); // integer milli-BTC

  // desired milli from requested volume (ceil so actual vol >= targetVol)
  var desiredBTCfromVol = targetVol / price;
  var desiredMilli = Math.ceil(desiredBTCfromVol * 1000 - 1e-12);

  // enforce min order qty
  var minMilli = Math.ceil(minOrderQty * 1000);
  if (desiredMilli > 0 && desiredMilli < minMilli) desiredMilli = minMilli;

  // cap to max allowed
  if (desiredMilli > maxMilliBTC) desiredMilli = maxMilliBTC;

  // convert to BTC and ensure multiple of minOrderQty (floor to be safe)
  var btcAmount = (desiredMilli / 1000);
  var stepCount = Math.floor((btcAmount + 1e-12) / minOrderQty);
  btcAmount = stepCount * minOrderQty;
  if (btcAmount < minOrderQty) btcAmount = 0;

  var volUSDT = +(btcAmount * price).toFixed(6);

  // --- LOG & RETURN ---
  console.log("📊 Kết quả tính toán (sửa lại):");
  console.log("• Tổng Volume (2 phía):", totalVolume);
  console.log("• Volume 1 phía:", targetVol);
  console.log("• Đòn bẩy (random):", leverage + "x");
  console.log("• Số dư khả dụng:", balance.toFixed(6), "USDT");
  console.log("• Giá BTC:", price.toLocaleString(undefined, { maximumFractionDigits: 8 }));
  console.log("• feeBuffer sử dụng:", feeBuffer.toFixed(6));
  console.log("• Max BTC khả dụng (theo buffer):", (maxMilliBTC / 1000).toFixed(3), "BTC");
  console.log("• BTC đặt lệnh (bội 0.001):", btcAmount.toFixed(3), "BTC");
  console.log("• Khối lượng USDT:", volUSDT.toFixed(3), "USDT");
  console.log("✅ Result: leverage:", leverage, ", BTC:", btcAmount.toFixed(3), ", Vol:", volUSDT.toFixed(3));

  return {
    leverage: leverage,
    balance: parseFloat(balance.toFixed(6)),
    price: parseFloat(price.toFixed(2)),
    feeBuffer: parseFloat(feeBuffer.toFixed(6)),
    maxBTCAllowed: parseFloat((maxMilliBTC / 1000).toFixed(3)),
    btcAmount: parseFloat(btcAmount.toFixed(3)),
    volUSDT: parseFloat(volUSDT.toFixed(3))
  };
}


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
  
    // helper: lấy tổng volume hiện tại từ bảng (phiên bản trả về số)
    function getTotalVolumeFromTable() {
      const rows = document.querySelectorAll("tbody tr");
      let totalVolume = 0;
      rows.forEach((row) => {
        try {
          const cells = row.querySelectorAll("td.bit-table-cell");
          if (cells.length < 5) return;
          const avgEntry = parseFloat(cells[2].textContent.replace(/,/g, "").trim());
          const avgExit = parseFloat(cells[3].textContent.replace(/,/g, "").trim());
          const qtyText = cells[4].textContent.trim();
          const qty = parseFloat(qtyText.replace(/[^\d.]/g, ""));
          if (isNaN(avgEntry) || isNaN(avgExit) || isNaN(qty)) return;
          const volume = avgEntry * qty + avgExit * qty;
          totalVolume += volume;
        } catch (e) {}
      });
      return totalVolume;
    }

    // helper: lấy random int
    function randInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // helper: phân tích hướng thị trường 1 lần — trả về "LONG" | "SHORT" | "NEUTRAL"
    // logic: lấy 5 mẫu liên tiếp cách nhau ~150ms, so sánh xu hướng như bạn mô tả
    // helper: phân tích hướng thị trường 1 lần — trả về "LONG" | "SHORT" | "NEUTRAL"
async function analyzeMarketDirectionOnce(timeout = 15000) {
  const buyXPath = '(//li[contains(@class, "contentTradeBuy")])[1]';
  const sellXPath = '(//li[contains(@class, "contentTradeSell")])[last()]';

  function getXPathNumber(xpath) {
    try {
      const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (!el) return null;
      const text = el.textContent.trim().replace(/,/g, "");
      const num = parseFloat(text);
      return isNaN(num) ? null : num;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    console.log("🔍 Bắt đầu phân tích hướng thị trường...");
    const buyPrices = [];
    const sellPrices = [];
    let lastBuy = getXPathNumber(buyXPath);
    let lastSell = getXPathNumber(sellXPath);
    const start = Date.now();

    const interval = setInterval(() => {
      const newBuy = getXPathNumber(buyXPath);
      const newSell = getXPathNumber(sellXPath);
      const now = Date.now();

      // kiểm tra timeout
      if (now - start > timeout) {
        clearInterval(interval);
        const fallback = Math.random() > 0.5 ? "LONG" : "SHORT";
        console.warn(`⚠️ Hết thời gian ${timeout / 1000}s — trả về ngẫu nhiên: ${fallback}`);
        resolve(fallback);
        return;
      }

      if (newBuy !== null && newSell !== null && (newBuy !== lastBuy || newSell !== lastSell)) {
        buyPrices.push(newBuy);
        sellPrices.push(newSell);
        if (buyPrices.length > 5) buyPrices.shift();
        if (sellPrices.length > 5) sellPrices.shift();

        lastBuy = newBuy;
        lastSell = newSell;

        console.log(`💹 Cập nhật giá: BUY=${newBuy}, SELL=${newSell}`);

        if (buyPrices.length >= 5) {
          let upCount = 0;
          let downCount = 0;
          for (let i = 1; i < buyPrices.length; i++) {
            if (buyPrices[i] > buyPrices[i - 1] && sellPrices[i] > sellPrices[i - 1]) upCount++;
            else if (buyPrices[i] < buyPrices[i - 1] && sellPrices[i] < sellPrices[i - 1]) downCount++;
          }

          if (upCount >= 3) {
            clearInterval(interval);
            console.log("✅ Kết quả phân tích: LONG");
            resolve("LONG");
          } else if (downCount >= 3) {
            clearInterval(interval);
            console.log("✅ Kết quả phân tích: SHORT");
            resolve("SHORT");
          }
        }
      }
    }, 100);
  });
}


    /*********************** BƯỚC 1: FLASH CLOSE (nếu có) ***********************/
    try {
      const flashCloseBtn = document.evaluate("//span[text()='Flash close']|//span[text()='Đóng nhanh']", document, null, 9, null).singleNodeValue;
      if (flashCloseBtn) {
        console.log("🔔 Found Flash close — clicking it first...");
        await safeClick(flashCloseBtn, true);
        let confirmBtn, start = Date.now();
        while (!(confirmBtn = document.evaluate("//button[text()='Confirm']|//button[text()='Xác nhận']", document, null, 9, null).singleNodeValue) && Date.now() - start < 10000) {
          await sleep(100);
        }
        if (confirmBtn) {
          await safeClick(confirmBtn);
          console.log("✅ Confirmed Flash close.");
        }
      } else {
        console.log("— Không có Flash close ban đầu.");
      }
    } catch (e) {
      console.error("❌ Lỗi bước Flash Close:", e);
    }
    /***************************************************************************/

    /*********************** BƯỚC 2+3: LẶP KIỂM TRA VÀ MỞ LỆNH ****************/
    let loopCount = 0;
    while (true) {
      loopCount++;
      try {
        console.log(`\n🔁 Vòng lặp kiểm tra #${loopCount} — mở Position history...`);
        await clickXpath("//div[text()='Position history']|//div[text()='Lịch sử vị thế']");
        await waitFor("//div[@class='bit-table-body']//tbody");
        await randomSleep(1200, 2100);

        // tính tổng volume hiện tại
        const totalVol = getTotalVolumeFromTable();
        console.log("📈 Total volume hiện có (USDT):", totalVol);

        if (totalVol >= minVol) {
          console.log("✅ Đã đạt/ vượt 20000 — dừng script.");
          break;
        }
        if (totalVol >= chosenVol) {
          console.log("✅ Đã đạt/ vượt chosenVol — dừng script.");
          break;
        }

        // nếu chưa đủ, tính volTrade cần bổ sung
        let volTrade = chosenVol - totalVol;
        // cap volTrade để tránh số quá nhỏ
        if (volTrade <= 0) {
          console.log("⚠️ VolTrade <= 0 sau phép tính — dừng.");
          break;
        }
        console.log("🔽 Vol cần thêm (USDT):", volTrade);

        /*************** SPOT => FUTURE (nếu cần) ***************/
        try {
          const zeroBalance = document.evaluate("//span[contains(text(),'Available')]/../span[text()='0.0000 USDT']", document, null, 9, null).singleNodeValue;
          if (zeroBalance) {
            console.log("💱 Số dư hiện bằng 0 — thực hiện transfer SPOT → FUTURE...");
            await safeClick(zeroBalance.parentElement.parentElement.querySelector("div button"));
            const [allBtn, confirmBtn] = await Promise.all([
              waitFor("//span[text()='All' or text()='Tất cả']"),
              waitFor("//button[text()='Confirm' or text()='Xác nhận']")
            ]);
            await safeClick(allBtn);
            await safeClick(confirmBtn);
            await waitFor("//span[text()='Successful transfer' or text()='Chuyển khoản thành công']", 10000);
            await randomSleep(1500, 2500);
            console.log("✅ Transfer thành công.");
          } else {
            console.log("— Không cần transfer (không phải zero balance).");
          }
        } catch (e) {
          console.warn("⚠️ Lỗi khi transfer (SPOT→Future):", e);
          // nếu không transfer được, vẫn tiếp tục thử (tuỳ logic bạn có thể return)
        }
        /*******************************************************/

        /*************** CHUYỂN SANG MARKET / NHẬP LOẠI LỆNH ***************/
        await clickXpath("//span[text()='Market' or text()='Thị trường']");
        await waitFor("//span[text()='To be executed at the best price']");

        // gọi hàm tính lượng cần đặt (calcBTCFutureVolumeWithTarget)
        console.log("🔢 Tính toán bằng calcBTCFutureVolumeWithTarget...");
        const res = calcBTCFutureVolumeWithTarget(
          volTrade, // target USDT cho calc
          balanceXPath,
          priceXPath,
          minLeverage,
          maxLeverage,
          { feeBuffer: feeBuffer }
        );

        if (!res) {
          console.error("❌ calcBTCFutureVolumeWithTarget trả về null — bail out.");
          break;
        }

        const LEVERAGE = res.leverage;
        const btcAmount = res.btcAmount;
        console.log("→ Đòn bẩy:", LEVERAGE, "x — BTC amount:", btcAmount);

        /******************** SET LEVERAGE ************************/
        try {
          const leverageBtn = await waitFor("//span[contains(text(),'Leverage ') or contains(text(),'Đòn bẩy ')]");
          // check if already correct (attempt)
          const already = document.evaluate(`//span[contains(text(),'Leverage') and contains(text(),'${LEVERAGE}')] | //span[contains(text(),'Đòn bẩy') and contains(text(),'${LEVERAGE}')]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (already) {
            console.log(`✅ Đòn bẩy đã là ${LEVERAGE}x — bỏ qua set leverage.`);
          } else {
            console.log(`⚙️ Thay đổi đòn bẩy thành ${LEVERAGE}x...`);
            await safeClick(leverageBtn);
            await waitFor("//span[text()='Leverage' or text()='Đòn bẩy']/../../input");
            await setValue(`//span[text()='Leverage' or text()='Đòn bẩy']/../../input`, LEVERAGE.toString());
            await clickXpath("//button[text()='Confirm' or text()='Xác nhận']");
            try {
              await waitFor("//span[text()='Editing successful']|//span[text()='Chỉnh sửa thành công']", 5000);
            } catch {}
            await randomSleep(800, 1200);
          }
        } catch (e) {
          console.error("❌ Lỗi khi set leverage:", e);
        }
        /**********************************************************/

        /******************** NHẬP SỐ LƯỢNG BTC ********************/
        try {
          console.log("⌨️ Nhập BTC amount vào input...");
          await waitFor(amountInputXPath);
          await setValue(amountInputXPath, btcAmount.toString());
          await randomSleep(500, 900);
        } catch (e) {
          console.error("❌ Lỗi nhập amount:", e);
        }
        /**********************************************************/

        /*************** PHÂN TÍCH HƯỚNG (LONG / SHORT) ***************/
        console.log("🔎 Phân tích hướng thị trường...");
        const direction = await analyzeMarketDirectionOnce(15000);
        console.log("📡 Kết luận phân tích:", direction);


        // click Open long / short
        try {
          if (direction === "LONG") {
            console.log("🟢 Mở LONG...");
            await clickXpath("//span[text()='Open long' or text()='Mở Long' or text()='Open Long']");
          } else {
            console.log("🔴 Mở SHORT...");
            await clickXpath("//span[text()='Open short' or text()='Mở Short' or text()='Open Short']");
          }
        } catch (e) {
          console.error("❌ Lỗi khi click Open long/short:", e);
        }

        // Handle confirm or flash close
        try {
          const confirmOrFlash = await waitFor("//button[text()='Confirm' or text()='Xác nhận'] | //span[text()='Flash close' or text()='Đóng nhanh'] ", 10000);
          if (confirmOrFlash && ["Confirm", "Xác nhận"].includes(confirmOrFlash.textContent.trim())) {
            console.log("🟢 Cần Confirm — bật setting trước khi Confirm");
            // bật setting
            await clickXpath("//p[@id='open-setting']/../../span/input");
            await randomSleep(500, 1000);
            await clickXpath("//button[text()='Confirm' or text()='Xác nhận']");
            await waitFor("//span[text()='Flash close' or text()='Đóng nhanh']", 5000);
            console.log("✅ Đã mở lệnh — Flash close hiện");
          } else {
            console.log("⚡ Flash close xuất hiện ngay — không cần Confirm");
          }

          // click Flash close để đóng ngay (theo quy trình bạn đưa)
          await waitFor("//span[text()='Flash close' or text()='Đóng nhanh']");
		  await randomSleep(3000, 6000);
          await clickXpath("//span[text()='Flash close' or text()='Đóng nhanh']");
          // theo dõi tối đa 5s để flash biến mất
          let disappeared = false;
          for (let i = 0; i < 10; i++) {
            const stillFlash = document.evaluate("//span[text()='Flash close' or text()='Đóng nhanh']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (!stillFlash) {
              disappeared = true;
              console.log("✅ Flash close biến mất — lệnh đã đóng.");
              break;
            }
            await sleep(500);
          }
          if (!disappeared) {
            console.warn("⚠️ Flash close vẫn tồn tại sau 5s — có thể lệnh chưa đóng hoặc cần xử lý khác.");
          }
        } catch (e) {
          console.error("❌ Lỗi khi xử lý Confirm/Flash:", e);
        }

        // Delay trước khi next loop (tránh spam)
        const delayMs = randInt(15000, 35000);
        console.log(`🔁 Chờ ${Math.round(delayMs / 1000)}s trước khi kiểm tra lại...`);
        await sleep(delayMs);
      } catch (err) {
        console.error("❌ Lỗi không mong muốn trong vòng lặp:", err);
        await randomSleep(5000, 8000);
      }
    } // end while

    /*************************** BƯỚC 4: KẾT THÚC ***************************/
    await randomSleep(1500, 2500);
    try {
      const zeroBalance = document.evaluate("//span[contains(text(),'Available') or contains(text(),'Khả dụng')]/../span[text()='0.0000 USDT']", document, null, 9, null).singleNodeValue;
      if (zeroBalance) {
        alert("DONE ✅");
      } else {
        const transferBtn = document.evaluate("//span[contains(text(),'Available') or contains(text(),'Khả dụng')]/../../div/button", document, null, 9, null).singleNodeValue;
        if (transferBtn) await safeClick(transferBtn);
		await randomSleep(800, 1200);
        const allBtn = await waitFor("//span[text()='All'  or text()='Tất cả']");
        const icon = await waitFor("//div[text()='Transfer' or text()='Chuyển khoản']/../div/div/div/i");
        const confirmBtn = await waitFor("//button[text()='Confirm' or text()='Xác nhận']");

        await safeClick(icon);
        await randomSleep(800, 1200);
        await safeClick(allBtn);
        await safeClick(confirmBtn);

        try {
          await waitFor("//span[contains(text(),'Available') or contains(text(),'Khả dụng'))]/../span[text()='0.0000 USDT']", 2000);
          await randomSleep(800, 1500);
          
        } catch {
        }
		  alert("DONE ✅");
      }
    } catch (e) {
      console.error("❌ Lỗi bước KẾT THÚC:", e);
    }
    /***************************************************************************/

  } catch (outerErr) {
    console.error("❌ Script fatal error:", outerErr);
  }
})();
