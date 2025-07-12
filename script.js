/* -------- Firebase config -------- */
const firebaseConfig = {
  apiKey: "AIzaSyAmRF2yktZggFVve-sLs4sN4r65JDVrDdY",          // 🔑 your Firebase key
  authDomain: "growth-lab-6aac7.firebaseapp.com",
  projectId: "growth-lab-6aac7"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

/* -------- DOM helpers -------- */
const qs = (s) => document.querySelector(s);
const on = (sel, fn) => qs(sel).addEventListener("click", fn);

/* -------- Auth flow -------- */
const authBox = qs("#authBox"),
      app     = qs("#app"),
      msg     = qs("#authMsg");

on("#emailSignUp", () => emailAuth("signup"));
on("#emailLogin",  () => emailAuth("login"));
on("#googleLogin", () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch((e) => (msg.textContent = e.message))
);
on("#logout", () => auth.signOut());

function emailAuth(mode) {
  const email = qs("#email").value.trim(),
        pass  = qs("#password").value;
  if (!email || !pass) {
    msg.textContent = "Fill both fields";
    return;
  }
  const fn = mode === "signup" ? auth.createUserWithEmailAndPassword : auth.signInWithEmailAndPassword;
  fn.call(auth, email, pass).catch((e) => (msg.textContent = e.message));
}

auth.onAuthStateChanged((user) => {
  if (user) {
    authBox.classList.add("hidden");
    app.classList.remove("hidden");
    initApp(user.uid);
  } else {
    app.classList.add("hidden");
    authBox.classList.remove("hidden");
  }
});

/* -------- App state -------- */
let UID = "",
    chart,
    chartData = [0, 0, 0, 0, 0, 0, 0];

function initApp(uid) {
  UID = uid;
  loadEntries();
  dailyReminder();
}

/* -------- Save entry -------- */
on("#saveBtn", async () => {
  const learning   = qs("#learning").value.trim(),
        reflection = qs("#reflection").value.trim(),
        task       = qs("#task").value.trim();

  if (!learning && !reflection && !task) return;

  const today = new Date().toISOString().split("T")[0];
  await db.collection("users").doc(UID).collection("entries")
          .doc(today).set({ date: today, learning, reflection, task, done: false });

  qs("#confirmation").textContent = "✅ Saved!";
  ["learning", "reflection", "task"].forEach((id) => (qs("#" + id).value = ""));
  loadEntries();
});

/* -------- Load & render entries -------- */
async function loadEntries() {
  const snap = await db.collection("users").doc(UID).collection("entries").get();
  const list = qs("#entriesList");
  list.innerHTML = "";
  chartData = [0, 0, 0, 0, 0, 0, 0];

  snap.docs
    .sort((a, b) => b.id.localeCompare(a.id))
    .forEach((doc) => {
      const e = doc.data(),
        div = document.createElement("div");
      div.className = "entry" + (e.done ? " completed" : "");
      div.innerHTML = `
        <h3>📅 ${e.date}</h3>
        <p><strong>📝 Learned:</strong> ${e.learning || "—"}</p>
        <p><strong>🤖 Reflection:</strong> ${e.reflection || "—"}</p>
        <p><strong>✅ Task:</strong> ${e.task || "—"}</p>
        <div>
          <span class="small-btn" data-k="${e.date}" data-a="edit">✏️ Edit</span>
          <span class="small-btn" data-k="${e.date}" data-a="delete">🗑️ Delete</span>
          <span class="toggleBadge" data-k="${e.date}" data-a="toggle">${e.done ? "✔ Goal done" : "Mark goal done"}</span>
        </div>`;
      list.appendChild(div);
      chartData[new Date(e.date).getDay()]++;
    });

  renderChart();
}

/* -------- Entry button actions -------- */
qs("#entriesList").addEventListener("click", async (ev) => {
  const { k, a } = ev.target.dataset;
  if (!a) return;

  const ref = db.collection("users").doc(UID).collection("entries").doc(k);

  if (a === "delete") {
    await ref.delete();
  } else {
    const e = (await ref.get()).data();
    if (a === "edit") {
      ["learning", "reflection", "task"].forEach((id) => (qs("#" + id).value = e[id]));
      await ref.delete();
    } else if (a === "toggle") {
      await ref.update({ done: !e.done });
    }
  }
  loadEntries();
});

/* -------- Progress chart -------- */
function renderChart() {
  const ctx = document.getElementById("progressChart");
  if (chart) {
    chart.data.datasets[0].data = chartData;
    chart.update();
    return;
  }
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [{ label: "Entries", data: chartData }]
    },
    options: { plugins: { legend: { display: false } } }
  });
}

/* -------- Daily reminder (8 PM local) -------- */
function dailyReminder() {
  if (!("Notification" in window)) return;
  Notification.requestPermission();
  const hour = 20;
  setInterval(() => {
    const n = new Date();
    if (n.getHours() === hour && n.getMinutes() === 0) {
      new Notification("Growth Lab", "Have you logged today?");
    }
  }, 60000);
}

/* -------- OpenAI weekly summary -------- */
const OPENAI_KEY = "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";

if (OPENAI_KEY === "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";
) console.warn("⚠️ Add your OpenAI key");

on("#summaryBtn", async () => {
  if (OPENAI_KEY === "YOUR_OPENAI_KEY") {
    alert("Add your OpenAI key in script.js");
    return;
  }

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split("T")[0];
  const snaps = await db
    .collection("users").doc(UID).collection("entries")
    .where("date", ">=", weekAgo).get();

  let prompt = "Summarize my week based on these logs:\n\n";
  snaps.forEach((d) => {
    const e = d.data();
    prompt += `Date ${e.date}: Learned ${e.learning}. Reflection ${e.reflection}. Task ${e.task}\n`;
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const js = await res.json();
  alert(js.choices?.[0]?.message?.content || "No summary");
});
