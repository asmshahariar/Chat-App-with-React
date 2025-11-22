import { useChatStore } from "../store/useChatStore";
import { MessageCircle, Users } from "lucide-react";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex gap-2 p-5 border-b border-slate-700/50 bg-slate-800/30">
      <button
        onClick={() => setActiveTab("chats")}
        className={`flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
          activeTab === "chats"
            ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30 scale-105"
            : "bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 hover:scale-102"
        }`}
      >
        <MessageCircle className="w-5 h-5" />
        <span>Chats</span>
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
          activeTab === "contacts"
            ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30 scale-105"
            : "bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300 hover:scale-102"
        }`}
      >
        <Users className="w-5 h-5" />
        <span>Contacts</span>
      </button>
    </div>
  );
}
export default ActiveTabSwitch;
