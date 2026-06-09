// ===============================
// TAB SYSTEM
// ===============================
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

// ===============================
// DARK MODE TOGGLE
// ===============================
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
});

// ===============================
// SETTINGS STORAGE
// ===============================
const defaultVatInput = document.getElementById("defaultVat");
const defaultExtraInput = document.getElementById("defaultExtra");
const saveSettingsBtn = document.getElementById("saveSettings");

saveSettingsBtn.addEventListener("click", () => {
    localStorage.setItem("vat", defaultVatInput.value);
    localStorage.setItem("extra", defaultExtraInput.value);
    alert("Settings Saved!");
    loadSettings();
});

function loadSettings() {
    let savedVat = localStorage.getItem("vat");
    let savedExtra = localStorage.getItem("extra");
    
    if (savedVat !== null) {
        if(defaultVatInput) defaultVatInput.value = savedVat;
        if(document.getElementById("vat")) document.getElementById("vat").value = savedVat;
    }
    if (savedExtra !== null) {
        if(defaultExtraInput) defaultExtraInput.value = savedExtra;
        if(document.getElementById("extraCharge")) document.getElementById("extraCharge").value = savedExtra;
    }
}

// ===============================
// AUTO TARIFF LOGIC
// ===============================
function calculateAutoTariff(units) {
    let bill = 0;
    let remaining = units;

    const slabs = [
        { limit: 50, rate: 4.63 },
        { limit: 25, rate: 5.26 },  
        { limit: 125, rate: 8.50 }, 
        { limit: 100, rate: 9.10 }, 
        { limit: 100, rate: 9.62 }, 
        { limit: 200, rate: 15.01 } 
    ];

    for (let slab of slabs) {
        if (remaining > slab.limit) {
            bill += slab.limit * slab.rate;
            remaining -= slab.limit;
        } else {
            bill += remaining * slab.rate;
            remaining = 0;
            break;
        }
    }

    if (remaining > 0) {
        bill += remaining * 17.35; 
    }

    return bill;
}

// ===============================
// BILL CALCULATION & SHOW IN UI FUNCTION
// ===============================
function showBillInUI(billData) {
    document.getElementById("rDate").innerText = billData.date || "-";
    document.getElementById("rName").innerText = billData.name || "-";
    document.getElementById("rCurrent").innerText = billData.current;
    document.getElementById("rPrevious").innerText = billData.previous;
    document.getElementById("rUnit").innerText = parseFloat(billData.units).toFixed(2);
    
    if(typeof billData.displayRate !== 'undefined') {
        document.getElementById("rRate").innerText = billData.displayRate;
    } else {
        document.getElementById("rRate").innerText = billData.unitRate;
    }
    
    document.getElementById("rEnergy").innerText = parseFloat(billData.energyBill).toFixed(2);
    document.getElementById("rVat").innerText = parseFloat(billData.vat).toFixed(2);
    document.getElementById("rExtra").innerText = (parseFloat(billData.extraCharge) + parseFloat(billData.meterRent)).toFixed(2);
    document.getElementById("rTotal").innerText = parseFloat(billData.total).toFixed(2);
    
    // উইন্ডো অবজেক্টে কারেন্ট ডেটা আপডেট রাখা
    window.lastBill = billData;
}

const calculateBtn = document.getElementById("calculateBtn");

calculateBtn.addEventListener("click", () => {
    let name = document.getElementById("customerName").value;
    let date = document.getElementById("billDate").value;

    let current = parseFloat(document.getElementById("currentReading").value);
    let previous = parseFloat(document.getElementById("previousReading").value);

    let rateMode = document.getElementById("rateMode").value;
    let unitRate = parseFloat(document.getElementById("unitRate").value);
    let vatPercent = parseFloat(document.getElementById("vat").value);
    let extraCharge = parseFloat(document.getElementById("extraCharge").value);

    let meterRent = parseFloat(document.getElementById("meterRent").value);

    if (isNaN(current) || isNaN(previous)) {
        alert("সব ইনপুট পূরণ করুন!");
        return;
    }

    if (rateMode === "manual" && isNaN(unitRate)) {
        alert("প্রতি ইউনিট রেট লিখুন!");
        return;
    }

    let units = current - previous;
    let energyBill = 0;
    let displayRate = "";

    if (rateMode === "auto") {
        energyBill = calculateAutoTariff(units);
        let avgRate = units > 0 ? (energyBill / units) : 0;
        displayRate = `Auto (Avg: ${avgRate.toFixed(2)})`;
        unitRate = avgRate;
    } else {
        energyBill = units * unitRate;
        displayRate = unitRate.toFixed(2);
    }

    let vat = (energyBill * vatPercent) / 100;
    let total = energyBill + vat + meterRent + extraCharge;

    // অবজেক্ট তৈরি করা হিস্ট্রির জন্য
    let billObject = {
        id: new Date().getTime(), // ইউনিক আইডি ওপেন করার জন্য
        name: name || "Unknown", 
        date: date || "-", 
        current, previous, units, unitRate, displayRate,
        energyBill, vat, extraCharge, meterRent, total
    };

    // UI তে দেখানো
    showBillInUI(billObject);
});

// ===============================
// SAVE HISTORY
// ===============================
document.getElementById("saveBtn").addEventListener("click", () => {
    if (!window.lastBill) {
        alert("প্রথমে বিল ক্যালকুলেট করুন!");
        return;
    }
    let history = JSON.parse(localStorage.getItem("history")) || [];
    
    // ডুপ্লিকেট সেভ এড়াতে আইডি চেক (যদি অলরেডি সেভ থাকে)
    let exists = history.some(item => item.id === window.lastBill.id);
    if (exists) {
        alert("This bill is already saved!");
        return;
    }

    history.push(window.lastBill);
    localStorage.setItem("history", JSON.stringify(history));
    loadHistory();
    alert("Saved!");
});

// ===============================
// LOAD HISTORY & VIEW OLD BILLS (PDF DIRECT TRIGGER)
// ===============================
function loadHistory(filterText = "") {
    let historyList = document.getElementById("historyList");
    let history = JSON.parse(localStorage.getItem("history")) || [];

    historyList.innerHTML = "";

    let filteredHistory = history.filter(item => 
        item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    filteredHistory.reverse().forEach(item => {
        let div = document.createElement("div");
        div.className = "history-item";
        div.style.cursor = "pointer"; // হাত চিহ্ন আসবে যাতে বোঝা যায় ক্লিক করা যাবে
        div.title = "Click to open PDF Invoice";

        div.innerHTML = `
            <b>👤 ${item.name}</b> (${item.date})<br>
            Units: ${item.units.toFixed(2)} | Total: ৳${item.total.toFixed(2)}
            <br><small style="color:#22c55e; font-size:11px;">🖨️ Click to open PDF</small>
        `;

        // === হিস্ট্রি আইটেমে ক্লিক করলে সরাসরি PDF ওপেন করার লজিক ===
        div.addEventListener("click", () => {
            window.lastBill = item; // ক্লিক করা আইটেমটির ডেটা সেট করা হলো
            document.getElementById("pdfBtn").click(); // সরাসরি PDF বাটনের ইভেন্টটি ট্রিগার করা হলো
        });

        historyList.appendChild(div);
    });
}

document.getElementById("searchHistory").addEventListener("input", (e) => {
    loadHistory(e.target.value);
});

// ===============================
// SHARE BILL
// ===============================
document.getElementById("shareBtn").addEventListener("click", () => {
    if (!window.lastBill) return;

    let text = `
Electricity Bill
Name: ${window.lastBill.name}
Units: ${window.lastBill.units.toFixed(2)}
Total: ৳${window.lastBill.total.toFixed(2)}
    `;

    navigator.share ? navigator.share({ text }) : alert(text);
});

// ===============================
// PDF EXPORT (PRO-TABLE FORMAT FIX)
// ===============================
document.getElementById("pdfBtn").addEventListener("click", () => {
    if (!window.lastBill) {
        alert("কোনো ডেটা নেই প্রিন্ট করার জন্য!");
        return;
    }
    
    let win = window.open("", "", "width=800,height=600");

    // রেজাল্ট এরিয়া থেকে ডেটা নিয়ে একটি সুন্দর ক্লিন টেবিল তৈরি করা
    let tableHtml = `
        <html>
        <head>
            <title>Electricity Bill - Invoice</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                .invoice-box { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); border-radius: 8px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #38bdf8; padding-bottom: 10px; }
                .header h2 { margin: 0; color: #0f172a; }
                table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; margin-top: 15px; }
                table td { padding: 10px; border-bottom: 1px solid #eee; }
                table tr.heading td { background: #f1f5f9; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
                table tr.total td { font-weight: bold; border-top: 2px solid #22c55e; color: #22c55e; font-size: 18px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="header">
                    <h2>⚡ Electricity Bill Receipt</h2>
                    <p>Generated Offline</p>
                </div>
                <table>
                    <tr class="heading">
                        <td>Description</td>
                        <td>Details / Amount</td>
                    </tr>
                    <tr>
                        <td>📅 Date</td>
                        <td>${window.lastBill.date}</td>
                    </tr>
                    <tr>
                        <td>👤 Customer Name</td>
                        <td>${window.lastBill.name}</td>
                    </tr>
                    <tr>
                        <td>🔢 Current Reading</td>
                        <td>${window.lastBill.current}</td>
                    </tr>
                    <tr>
                        <td>🔢 Previous Reading</td>
                        <td>${window.lastBill.previous}</td>
                    </tr>
                    <tr>
                        <td>⚡ Used Unit</td>
                        <td><b>${window.lastBill.units.toFixed(2)}</b></td>
                    </tr>
                    <tr>
                        <td>💰 Unit Rate (Avg/Manual)</td>
                        <td>৳ ${typeof window.lastBill.displayRate !== 'undefined' ? window.lastBill.displayRate : window.lastBill.unitRate}</td>
                    </tr>
                    <tr>
                        <td>💵 Energy Bill</td>
                        <td>৳ ${window.lastBill.energyBill.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>📊 VAT</td>
                        <td>৳ ${window.lastBill.vat.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>➕ Extra Charges & Rent</td>
                        <td>৳ ${(window.lastBill.extraCharge + window.lastBill.meterRent).toFixed(2)}</td>
                    </tr>
                    <tr class="total">
                        <td>🧾 Total Payable Bill</td>
                        <td>৳ ${window.lastBill.total.toFixed(2)}</td>
                    </tr>
                </table>
                <div class="footer">
                    <p>Thank you for using Electricity Bill App</p>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;

    win.document.write(tableHtml);
    win.document.close();
});

// অ্যাপ চালু হওয়ার সময় রান হবে
loadSettings();
loadHistory();

// ===============================
// REGISTER SERVICE WORKER
// ===============================
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
    .then(() => console.log("Service Worker Registered"))
    .catch(err => console.log("SW Error:", err));
}