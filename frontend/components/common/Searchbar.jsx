import { Search } from "lucide-react";

export default function Searchbar() {
  return (
    <div className="flex items-center bg-[#f1f5f9] rounded-lg px-4 py-2.5 w-full max-w-2xl">
      <Search className="w-5 h-5 text-gray-500 mr-3" />
      <input
        type="text"
        placeholder="Search for groceries, vegetables, fruits..."
        className="bg-transparent border-none outline-none w-full text-gray-700 placeholder-gray-400 text-[15px]"
      />
    </div>
  );
}
