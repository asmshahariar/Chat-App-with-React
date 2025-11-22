import { useEffect, useRef, useMemo } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import TypingIndicator from "./TypingIndicator";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const typingIndicatorRef = useRef(null);

  // Early return if no selected user
  if (!selectedUser || !selectedUser._id) {
    return null;
  }

  // Check if users are friends - if not, show message
  if (!selectedUser.isFriend) {
    return (
      <>
        <ChatHeader />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden ring-2 ring-slate-700/50 mb-4">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">{selectedUser.fullName}</h3>
              <p className="text-slate-400 mb-6">
                You need to be friends with {selectedUser.fullName} to send messages.
              </p>
              <p className="text-sm text-slate-500">
                Go to the Contacts tab and send a friend request to start chatting.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Normalize selectedUser._id for comparison
  const selectedUserIdStr = selectedUser._id?.toString();
  const isSelectedUserTyping = useMemo(() => {
    return typingUsers[selectedUserIdStr];
  }, [typingUsers, selectedUserIdStr]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  // Only scroll when messages change, not when typing indicator changes
  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      // Use a small timeout to batch scroll operations
      const timeoutId = setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length]);

  // Separate effect for typing indicator scroll (only scroll once when it first appears)
  useEffect(() => {
    if (isSelectedUserTyping && typingIndicatorRef.current) {
      // Only scroll once when typing indicator first appears, not on every update
      const timeoutId = setTimeout(() => {
        if (typingIndicatorRef.current) {
          typingIndicatorRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [isSelectedUserTyping, selectedUserIdStr]); // Only trigger when typing user changes, not on every typing update

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {!isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length > 0 && messages.map((msg) => {
              const isOwnMessage = msg.senderId?.toString() === authUser?._id?.toString();
              return (
                <div
                  key={msg._id}
                  className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
                >
                  <div
                    className={`chat-bubble relative ${
                      isOwnMessage
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                    )}
                    {msg.text && <p className="mt-2">{msg.text}</p>}
                    <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            {/* Typing Indicator - Show even if no messages */}
            {isSelectedUserTyping && (
              <div ref={typingIndicatorRef} className="chat chat-start" key="typing-indicator">
                <div className="chat-bubble bg-slate-800 text-slate-200">
                  <TypingIndicator userName={isSelectedUserTyping.fullName || selectedUser.fullName || "User"} />
                </div>
              </div>
            )}
            {/* 👇 scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : (
          <MessagesLoadingSkeleton />
        )}
        {messages.length === 0 && !isMessagesLoading && !isSelectedUserTyping && (
          <NoChatHistoryPlaceholder name={selectedUser.fullName || "User"} />
        )}
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;
