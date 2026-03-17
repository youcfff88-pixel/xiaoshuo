const GENRE_MAP = {
  "玄幻修仙": "玄幻修仙，文风磅礴大气，充满东方神话色彩，境界描写细腻，战斗场面激烈壮观",
  "都市言情": "都市言情，文风细腻温情，注重人物内心描写和情感变化，对话自然生动",
  "悬疑推理": "悬疑推理，文风紧凑神秘，善于埋设伏笔和制造悬念，节奏张弛有度",
  "科幻冒险": "科幻冒险，文风充满想象力，科技感与未来感并重，世界观构建宏大",
  "历史穿越": "历史穿越，文风兼顾历史厚重感与现代视角，史实融合精准，朝堂江湖皆可驾驭",
  "武侠江湖": "武侠江湖，文风豪迈潇洒，快意恩仇，门派纷争与武学秘籍融为一体",
  "恐怖灵异": "恐怖灵异，文风阴森诡异，善于营造恐怖氛围，心理描写细腻入微"
};

const POLISH_MODE_MAP = {
  1: "提升文采意境，加强比喻排比，让文字更有韵律感",
  2: "精简压缩，去除冗余，保留核心内容，让行文更简洁有力",
  3: "增加细节描写，丰富感官体验，让场景更加立体生动",
  4: "改写为古风文言风格，典雅含蓄，意境深远"
};

let currentGenre = "玄幻修仙";
let currentPolishMode = 1;
let outputText = "";
let startTime = 0;
let timer = null;

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const outputWrap = document.getElementById("outputWrap");
const outputLabel = document.getElementById("outputLabel");
const outputTextEl = document.getElementById("outputText");
const statusLine = document.getElementById("statusLine");
const statWords = document.getElementById("statWords");
const statTime = document.getElementById("statTime");

function switchTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tabName}`));
}

tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

document.querySelectorAll("#genre-group .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#genre-group .chip").forEach((item) => item.classList.remove("on"));
    chip.classList.add("on");
    currentGenre = chip.dataset.genre;
  });
});

document.querySelectorAll("#polish-group .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#polish-group .chip").forEach((item) => item.classList.remove("on"));
    chip.classList.add("on");
    currentPolishMode = Number(chip.dataset.mode);
  });
});

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function startOutput(label) {
  outputText = "";
  startTime = Date.now();
  outputLabel.textContent = label;
  outputTextEl.textContent = "";
  statusLine.textContent = "正在请求后端 /api/chat ...";
  statWords.textContent = "0";
  statTime.textContent = "0.0s";
  outputWrap.scrollIntoView({ behavior: "smooth", block: "start" });

  clearInterval(timer);
  timer = setInterval(() => {
    statTime.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
  }, 150);
}

function updateOutput(text, status) {
  outputText = text;
  outputTextEl.textContent = outputText || "这里会显示生成结果...";
  statWords.textContent = String((outputText || "").replace(/\s/g, "").length);
  if (status) {
    statusLine.textContent = status;
  }
}

function appendOutput(text, status) {
  outputText += text;
  updateOutput(outputText, status);
}

function finishOutput(status = "生成完成") {
  clearInterval(timer);
  statusLine.textContent = status;
  statTime.textContent = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
}

function setButtonLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  button.disabled = loading;
  button.textContent = loading ? "处理中..." : button.dataset.defaultText;
}

async function callApi(messages, temperature) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.detail || `请求失败：${response.status}`);
  }

  if (!data.text) {
    throw new Error("后端没有返回 text 字段");
  }

  return data.text;
}

async function doCreate() {
  const theme = document.getElementById("c-theme").value.trim();
  if (!theme) {
    showToast("请输入故事主题");
    return;
  }

  const title = document.getElementById("c-title").value.trim();
  const chars = document.getElementById("c-chars").value.trim();
  const chapters = Number(document.getElementById("c-chaps").value);
  const words = document.getElementById("c-words").value;
  const temperature = Number(document.getElementById("c-temp").value);

  setButtonLoading("btn-create", true);
  startOutput("✦ 创作中...");

  try {
    const systemPrompt = `你是一位擅长${GENRE_MAP[currentGenre]}的小说作家。请按要求创作内容，包含章节标题，文笔优美，情节引人入胜。`;
    const titlePart = title ? `《${title}》` : "（请自动为小说起一个贴合主题的标题）";

    const history = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `请创作小说 ${titlePart}。\n主题简介：${theme}\n主要角色：${chars || "由你自由设定"}\n要求：写第一章，约${words}字，开篇引人入胜，包含章节标题。`
      }
    ];

    for (let i = 1; i <= chapters; i += 1) {
      statusLine.textContent = `正在生成第 ${i} / ${chapters} 章...`;
      const chapterText = await callApi(history, temperature);
      if (i > 1) {
        appendOutput("\n\n", `第 ${i} 章已完成`);
      }
      appendOutput(chapterText, `第 ${i} 章已完成`);
      history.push({ role: "assistant", content: chapterText });
      if (i < chapters) {
        history.push({
          role: "user",
          content: `请继续创作第${i + 1}章，约${words}字，保持人物和情节连贯，包含章节标题。`
        });
      }
    }

    finishOutput("全部章节生成完成");
  } catch (error) {
    finishOutput(`出错了：${error.message}`);
    showToast(error.message);
  } finally {
    setButtonLoading("btn-create", false);
  }
}

async function doContinue() {
  const text = document.getElementById("cont-text").value.trim();
  if (!text) {
    showToast("请粘贴已有内容");
    return;
  }

  const direction = document.getElementById("cont-dir").value.trim();
  const words = document.getElementById("cont-words").value;

  setButtonLoading("btn-continue", true);
  startOutput("◈ 续写中...");

  try {
    const messages = [
      { role: "system", content: "你是一位专业小说作家，文笔流畅优美，擅长情节续写，保持原有风格。" },
      {
        role: "user",
        content: `以下是小说已有内容：\n\n${text}\n\n${direction ? `续写要求：${direction}\n` : ""}请继续创作，约${words}字，保持风格和情节连贯自然。`
      }
    ];

    const result = await callApi(messages, 0.9);
    updateOutput(result, "续写完成");
    finishOutput("续写完成");
  } catch (error) {
    finishOutput(`出错了：${error.message}`);
    showToast(error.message);
  } finally {
    setButtonLoading("btn-continue", false);
  }
}

async function doOutline() {
  const theme = document.getElementById("out-theme").value.trim();
  if (!theme) {
    showToast("请输入故事主题与背景");
    return;
  }

  const chapters = document.getElementById("out-chaps").value;
  const roles = document.getElementById("out-roles").value;

  setButtonLoading("btn-outline", true);
  startOutput("◉ 生成大纲中...");

  try {
    const messages = [
      { role: "system", content: "你是一位资深小说策划师，擅长构建宏大世界观和缜密情节架构。" },
      {
        role: "user",
        content: `请为以下主题创作详细小说大纲：\n${theme}\n\n要求：\n1. 写小说简介和核心设定（世界观、主角${roles}位、主线冲突）\n2. 规划${chapters}章，每章给出章节名和100字左右的内容梗概\n3. 最后说明主要人物关系和故事走向。`
      }
    ];

    const result = await callApi(messages, 0.8);
    updateOutput(result, "大纲生成完成");
    finishOutput("大纲生成完成");
  } catch (error) {
    finishOutput(`出错了：${error.message}`);
    showToast(error.message);
  } finally {
    setButtonLoading("btn-outline", false);
  }
}

async function doPolish() {
  const text = document.getElementById("pol-text").value.trim();
  if (!text) {
    showToast("请粘贴需要润色的原文");
    return;
  }

  setButtonLoading("btn-polish", true);
  startOutput("✧ 润色中...");

  try {
    const messages = [
      { role: "system", content: "你是一位文学功底深厚的小说编辑，擅长文字润色和风格改写。" },
      {
        role: "user",
        content: `请对以下小说文本进行润色，方向：${POLISH_MODE_MAP[currentPolishMode]}。\n保持原有情节和人物不变，只优化文字表达。\n\n原文：\n${text}`
      }
    ];

    const result = await callApi(messages, 0.85);
    updateOutput(result, "润色完成");
    finishOutput("润色完成");
  } catch (error) {
    finishOutput(`出错了：${error.message}`);
    showToast(error.message);
  } finally {
    setButtonLoading("btn-polish", false);
  }
}

document.getElementById("btn-create").dataset.defaultText = "✦ 开始创作";
document.getElementById("btn-continue").dataset.defaultText = "◈ 开始续写";
document.getElementById("btn-outline").dataset.defaultText = "◉ 生成大纲";
document.getElementById("btn-polish").dataset.defaultText = "✧ 开始润色";

document.getElementById("btn-create").addEventListener("click", doCreate);
document.getElementById("btn-continue").addEventListener("click", doContinue);
document.getElementById("btn-outline").addEventListener("click", doOutline);
document.getElementById("btn-polish").addEventListener("click", doPolish);

document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!outputText) {
    showToast("还没有可复制的内容");
    return;
  }
  await navigator.clipboard.writeText(outputText);
  showToast("已复制到剪贴板");
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  if (!outputText) {
    showToast("还没有可下载的内容");
    return;
  }
  const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const time = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  link.href = URL.createObjectURL(blob);
  link.download = `小说_${time}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("已开始下载");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  outputText = "";
  updateOutput("", "已清空输出");
  statTime.textContent = "0.0s";
});
