import { getRecentTips } from './src/gemini.js';
async function run() {
  try {
    const res = await getRecentTips("Snow Lake", "Snoqualmie Pass, WA", 47.4418, -121.4234);
    console.log("Success:", res);
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
