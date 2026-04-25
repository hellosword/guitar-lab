/**
 * Guitar Lab 根组件
 * 当前为项目骨架阶段，仅展示基础布局
 * TODO: 接入 react-router-dom 路由
 */
function App() {
  return (
    <div className="min-h-screen bg-guitar-dark text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-guitar-accent mb-4">
        Guitar Lab
      </h1>
      <p className="text-lg text-gray-300 mb-8">
        吉他指板记忆训练
      </p>
      <div className="bg-white/10 rounded-xl p-6 max-w-md w-full text-center">
        <p className="text-sm text-gray-400">
          项目骨架已搭建完成 🎸
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
            React 18
          </span>
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs">
            Tailwind
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
