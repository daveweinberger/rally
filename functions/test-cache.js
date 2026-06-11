import { getRecentTips } from './src/gemini.js';
async function run() {
  try {
    console.log("--- First Call ---");
    const res1 = await getRecentTips("Snow Lake", "Snoqualmie Pass, WA", 47.4418, -121.4234);
    console.log("Success 1:", res1.recentTips.length, "tips");
    
    console.log("\n--- Second Call (Should Hit Cache) ---");
    const res2 = await getRecentTips("Snow Lake", "Snoqualmie Pass, WA", 47.4418, -121.4234);
    console.log("Success 2:", res2.recentTips.length, "tips");
    
    process.exit(0);
  } catch(e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
run();
