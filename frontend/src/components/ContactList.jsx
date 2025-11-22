import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { UserPlus, Check, X, Clock } from "lucide-react";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriendRequests,
  } = useFriendStore();

  useEffect(() => {
    getAllContacts();
    getFriendRequests();
  }, [getAllContacts, getFriendRequests]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  const handleFriendAction = async (contact, e) => {
    e.stopPropagation(); // Prevent selecting the user

    if (contact.isFriend) {
      // Already friends, can chat
      setSelectedUser(contact);
      return;
    }

    if (contact.friendRequestStatus === "sent") {
      // Cancel friend request
      if (contact.friendRequestId) {
        await cancelFriendRequest(contact.friendRequestId);
      }
    } else if (contact.friendRequestStatus === "received") {
      // Accept friend request
      if (contact.friendRequestId) {
        await acceptFriendRequest(contact.friendRequestId);
        setSelectedUser(contact); // Open chat after accepting
      }
    } else {
      // Send friend request
      await sendFriendRequest(contact._id);
    }
  };

  return (
    <>
      {allContacts.map((contact) => {
        const isOnline = onlineUsers.some((id) => id?.toString() === contact._id?.toString());
        const isFriend = contact.isFriend;
        const requestStatus = contact.friendRequestStatus;

        return (
          <div
            key={contact._id}
            className={`bg-cyan-500/10 p-4 rounded-lg transition-colors ${
              isFriend
                ? "cursor-pointer hover:bg-cyan-500/20"
                : "cursor-default"
            }`}
            onClick={() => isFriend && setSelectedUser(contact)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="avatar relative flex-shrink-0">
                  <div className="size-12 rounded-full ring-2 ring-slate-700/50 overflow-hidden">
                    <img src={contact.profilePic || "/avatar.png"} alt={contact.fullName} className="w-full h-full object-cover" />
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 size-3.5 bg-green-500 border-2 border-slate-800 rounded-full z-10 shadow-lg shadow-green-500/50"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-200 font-medium truncate">{contact.fullName}</h4>
                  {isFriend ? (
                    <p className="text-xs text-green-400 font-medium mt-0.5">Friend</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">Not a friend</p>
                  )}
                </div>
              </div>

              {/* Friend Action Button */}
              <button
                onClick={(e) => handleFriendAction(contact, e)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 flex-shrink-0 ${
                  isFriend
                    ? "bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30"
                    : requestStatus === "sent"
                    ? "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30"
                    : requestStatus === "received"
                    ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30"
                    : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30"
                }`}
              >
                {isFriend ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Chat</span>
                  </>
                ) : requestStatus === "sent" ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Pending</span>
                  </>
                ) : requestStatus === "received" ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Accept</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
export default ContactList;
