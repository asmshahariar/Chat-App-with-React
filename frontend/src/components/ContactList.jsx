import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { UserPlus, Check, X, Clock } from "lucide-react";

function ContactList({ onUserSelect }) {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriendRequests,
  } = useFriendStore();

  const { subscribeToFriendRequests, unsubscribeFromFriendRequests } = useFriendStore();

  useEffect(() => {
    getAllContacts();
    getFriendRequests(true); // Initial load
    
    // Subscribe to real-time friend request updates
    subscribeToFriendRequests();
    
    // Also set up a fallback polling mechanism (every 10 seconds) in case socket fails
    const interval = setInterval(() => {
      getFriendRequests(true);
    }, 10000);
    
    return () => {
      clearInterval(interval);
      unsubscribeFromFriendRequests();
    };
  }, [getAllContacts, getFriendRequests, subscribeToFriendRequests, unsubscribeFromFriendRequests]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  const handleFriendAction = async (contact, e) => {
    e.stopPropagation(); // Prevent selecting the user

    if (contact.isFriend) {
      // Already friends, can chat
      if (onUserSelect) {
        onUserSelect(contact);
      } else {
        setSelectedUser(contact);
      }
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
        // Open chat after accepting
        if (onUserSelect) {
          onUserSelect(contact);
        } else {
          setSelectedUser(contact);
        }
      }
    } else {
      // Send friend request
      await sendFriendRequest(contact._id);
    }
  };

  const handleContactClick = (contact) => {
    if (contact.isFriend) {
      if (onUserSelect) {
        onUserSelect(contact);
      } else {
        setSelectedUser(contact);
      }
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
            className={`bg-cyan-500/10 p-3 md:p-4 rounded-lg transition-colors ${
              isFriend
                ? "cursor-pointer hover:bg-cyan-500/20"
                : "cursor-default"
            }`}
            onClick={() => handleContactClick(contact)}
          >
            <div className="flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="avatar relative flex-shrink-0">
                  <div className="size-10 md:size-12 rounded-full ring-2 ring-slate-700/50 overflow-hidden">
                    <img src={contact.profilePic || "/avatar.png"} alt={contact.fullName} className="w-full h-full object-cover" />
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 size-3 md:size-3.5 bg-green-500 border-2 border-slate-800 rounded-full z-10 shadow-lg shadow-green-500/50"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-200 font-medium text-sm md:text-base truncate">{contact.fullName}</h4>
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
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 md:gap-2 flex-shrink-0 ${
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
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline md:inline">Chat</span>
                  </>
                ) : requestStatus === "sent" ? (
                  <>
                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline md:inline">Pending</span>
                  </>
                ) : requestStatus === "received" ? (
                  <>
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline md:inline">Accept</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="hidden sm:inline md:inline">Add</span>
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
