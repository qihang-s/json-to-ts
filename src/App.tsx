import { useState } from "react";
import { jsonToTs } from "./utils/jsonToTs";

function App() {
  const [jsonInput, setJsonInput] = useState<string>(
    '{\n  "id": 1,\n  "name": "ChatGPT",\n  "active": true\n}'
  );
  const [tsOutput, setTsOutput] = useState<string>("");

  
  
const handleConvert = (): void => {
  try {
    const obj = safeParseJson(jsonInput);
    const ts = jsonToTs(obj, "RootObject");
    setTsOutput(ts);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    setTsOutput("// ❌ JSON 格式错误");
  }
};

function safeParseJson(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    // 1. 统一引号
    let fixed = input.replace(/[“”]/g, '"').replace(/'/g, '"');

    // 2. 临时替换字符串为占位符
    const stringLiterals: string[] = [];
    fixed = fixed.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      stringLiterals.push(match);
      return `__STR_PLACEHOLDER_${stringLiterals.length - 1}__`;
    });

    // 3. 给 key 补双引号
    fixed = fixed.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

    // 4. 补逗号：在值和下一个 key 之间加逗号
    fixed = fixed.replace(
      /([}\]0-9truefalsenull])\s+(?=")/g,
      '$1, '
    );

    // 5. 恢复字符串占位符
    fixed = fixed.replace(/__STR_PLACEHOLDER_(\d+)__/g, (_, idx) => stringLiterals[+idx]);
    console.log(fixed)
    return JSON.parse(fixed);
  }
}




  const handleCopy = (): void => {
    if (tsOutput) {
      navigator.clipboard.writeText(tsOutput);
      alert("✅ 已复制到剪贴板");
    }
  };

  return (
   <div className="h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-gray-100 font-mono p-6">
  <h1 className="text-4xl font-extrabold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
    ⚡ JSON → TypeScript 转换器
  </h1>

  <div className="h-[calc(100%-4rem)] grid grid-cols-2 gap-6">
    {/* 输入区 */}
    <div className="flex flex-col bg-gray-900/70 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-700">
      <h2 className="text-lg font-bold mb-2 text-cyan-400">输入 JSON</h2>
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        className="flex-1 w-full p-3 rounded-lg bg-gray-950 text-green-400 border border-gray-700 focus:ring-2 focus:ring-cyan-400 outline-none resize-none"
      />
      <button
        onClick={handleConvert}
        className="mt-2 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
      >
        🚀 转换
      </button>
    </div>

    {/* 输出区 */}
    <div className="flex flex-col bg-gray-900/70 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-700">
      <h2 className="text-lg font-bold mb-2 text-purple-400">输出 TypeScript</h2>
      <textarea
        value={tsOutput}
        readOnly
        className="flex-1 w-full p-3 rounded-lg bg-gray-950 text-blue-300 border border-gray-700 focus:ring-2 focus:ring-purple-400 outline-none resize-none"
      />
      <button
        onClick={handleCopy}
        className="mt-2 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:from-pink-600 hover:to-red-500 transition-all duration-300"
      >
        📋 复制结果
      </button>
    </div>
  </div>
</div>

  );
}

export default App;
