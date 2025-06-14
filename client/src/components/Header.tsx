import { X, ChevronDown, MoreVertical, ChevronLeft } from "lucide-react";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const Header = ({ title, showBackButton = false, onBackClick }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-secondary sticky top-0 z-50 border-b border-gray-800">
      <button className="w-8 h-8 flex items-center justify-center text-white">
        {showBackButton ? (
          <ChevronLeft onClick={onBackClick} className="w-6 h-6" />
        ) : (
          <X className="w-6 h-6" />
        )}
      </button>
      <h1 className="text-xl font-display font-semibold text-white">{title}</h1>
      <div className="flex space-x-4">
        <button className="w-8 h-8 flex items-center justify-center text-white">
          <ChevronDown className="w-6 h-6" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-white">
          <MoreVertical className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;
