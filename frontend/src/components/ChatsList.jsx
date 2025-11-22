import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <>
      {chats.map((chat) => (
        <div
          key={chat._id}
          className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
          onClick={() => setSelectedUser({ ...chat, isFriend: true })}
        >
          <div className="flex items-center gap-3">
            <div className="avatar relative">
              <div className="size-12 rounded-full ring-2 ring-slate-700/50">
                <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
              </div>
              {onlineUsers.some((id) => id?.toString() === chat._id?.toString()) && (
                <span className="absolute bottom-0 right-0 size-3.5 bg-green-500 border-2 border-slate-800 rounded-full z-10 shadow-lg shadow-green-500/50"></span>
              )}
            </div>
            <h4 className="text-slate-200 font-medium truncate">{chat.fullName}</h4>
          </div>
        </div>
      ))}
    </>
  );
}
export default ChatsList;
