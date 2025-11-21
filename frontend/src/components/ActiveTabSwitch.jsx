import { useChatStore } from "../store/useChatStore";
import { MessageCircleIcon, UsersIcon } from "lucide-react";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="px-4 py-2 border-b border-slate-700/50">
      <div className="flex gap-2 bg-slate-800/30 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${
            activeTab === "chats"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
          }`}
        >
          <MessageCircleIcon className="size-4" />
          <span>Chats</span>
        </button>

        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${
            activeTab === "contacts"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
          }`}
        >
          <UsersIcon className="size-4" />
          <span>Contacts</span>
        </button>
      </div>
    </div>
  );
}
export default ActiveTabSwitch;
