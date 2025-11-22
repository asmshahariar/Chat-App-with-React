import { XIcon, ArrowLeft } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.some((id) => id?.toString() === selectedUser?._id?.toString());

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  const handleBack = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedUser(null);
  };

  return (
    <div
      className="flex justify-between items-center bg-slate-800/50 border-b
   border-slate-700/50 max-h-[84px] px-4 md:px-6 flex-1"
    >
      <div className="flex items-center space-x-3">
        {/* Mobile Back Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleBack(e);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleBack(e);
          }}
          className="md:hidden p-3 -ml-2 text-slate-400 hover:text-slate-200 active:text-slate-100 active:bg-slate-700/30 transition-colors touch-manipulation z-50 relative cursor-pointer rounded-lg"
          aria-label="Back to chats"
          type="button"
          style={{ WebkitTapHighlightColor: 'transparent', minWidth: '44px', minHeight: '44px' }}
        >
          <ArrowLeft className="w-5 h-5 pointer-events-none" />
        </button>

        <div className="avatar relative">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full ring-2 ring-slate-700/50">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} className="w-full h-full object-cover rounded-full" />
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 size-3 md:size-3.5 bg-green-500 border-2 border-slate-800 rounded-full z-10 shadow-lg shadow-green-500/50"></span>
          )}
        </div>

        <div>
          <h3 className="text-slate-200 font-medium text-sm md:text-base">{selectedUser.fullName}</h3>
          <p className="text-slate-400 text-xs md:text-sm">{isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      {/* Desktop Close Button */}
      <button 
        onClick={handleBack}
        className="hidden md:block"
        aria-label="Close chat"
      >
        <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
      </button>
    </div>
  );
}
export default ChatHeader;
