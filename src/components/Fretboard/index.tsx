/**
 * 指板图 SVG 组件
 * 用于展示吉他指板、高亮品格、接收点击输入
 * TODO: 实现 SVG 指板渲染与交互逻辑
 */
export default function Fretboard() {
  return (
    <svg viewBox="0 0 800 300" className="w-full">
      <text x="400" y="150" textAnchor="middle" fill="#666">
        指板图占位
      </text>
    </svg>
  );
}
