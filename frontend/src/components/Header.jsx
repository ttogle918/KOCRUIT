import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="w-full bg-blue-600 dark:bg-blue-950 text-white py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* 왼쪽 여백으로 placeholder 두기 (중앙 정렬 위한 트릭) */}
        <div className="w-12 sm:w-16">
          <Link to="/back" aria-label="뒤로가기">
            <i className="arrow_back" />
          </Link>
        </div>
        {/* 가운데 타이틀 */}
        <h1 className="text-xl font-bold text-center flex-1">채용(수정..)</h1>

        {/* 오른쪽 아이콘 버튼들 */}
        <div className="flex space-x-4 w-12 sm:w-16 justify-end">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-blue-500 dark:hover:bg-blue-900 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? '🌞' : '🌙'}
          </button>
          <Link to="/login" aria-label="로그인">
            <i className="fa fa-user-circle-o" />
          </Link>
          <Link to="/" aria-label="설정">
            <i className="glyphicon glyphicon-cog" />
          </Link>
        </div>
      </div>
    </header>
  );
}
