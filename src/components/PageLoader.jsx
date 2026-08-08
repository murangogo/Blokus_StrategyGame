// 路径：src/components/PageLoader.jsx
// 全屏加载态，供路由懒加载的 Suspense 兜底与各页面复用
function PageLoader({ title = '加载中...', subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">{title}</p>
        {subtitle && <p className="text-gray-400 text-sm mt-2">{subtitle}</p>}
      </div>
    </div>
  );
}

export default PageLoader;
