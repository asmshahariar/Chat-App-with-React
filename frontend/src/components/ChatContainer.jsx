import { useEffect, useRef, useMemo, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import TypingIndicator from "./TypingIndicator";
import { XIcon, DownloadIcon, EyeIcon } from "lucide-react";

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

function ChatContainer() {
  const [previewImage, setPreviewImage] = useState(null); // { url, fileName } or null
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
              {previewImage && (
                <ImagePreviewModal 
                  image={previewImage.url || previewImage} 
                  imageFileName={previewImage.fileName}
                  onClose={() => setPreviewImage(null)} 
                />
              )}
              <div className="flex-1 px-4 md:px-6 overflow-y-auto py-4 md:py-8">
        {!isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {messages.length > 0 && messages.map((msg) => {
              // Handle both populated senderId object and string ID
              const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString() || msg.senderId;
              const currentUserId = authUser?._id?.toString();
              const isOwnMessage = senderId === currentUserId;
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
                      <div className="relative mb-2">
                        <img 
                          src={msg.image} 
                          alt="Shared" 
                          className="rounded-lg h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setPreviewImage({ url: msg.image, fileName: msg.fileName });
                            // Mark as viewed if it's a disappearing photo
                            if (msg.isDisappearing && !msg.isViewed && !isOwnMessage) {
                              useChatStore.getState().markMessageAsViewed(msg._id);
                            }
                          }}
                        />
                        {msg.isDisappearing && !isOwnMessage && (
                          <div className="absolute top-2 right-2 bg-yellow-500/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" />
                            <span>View once</span>
                          </div>
                        )}
                        {msg.isDisappearing && msg.isViewed && !isOwnMessage && (
                          <div className="absolute inset-0 bg-slate-900/80 rounded-lg flex items-center justify-center">
                            <p className="text-slate-400 text-sm">Photo has been viewed</p>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.file && (
                      <div className="mb-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate" title={msg.fileName || "File"}>
                              {msg.fileName || "File"}
                            </p>
                            {msg.fileSize && (
                              <p className="text-xs text-slate-400">
                                {formatFileSize(msg.fileSize)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              // Programmatic download to ensure correct filename with extension
                              const link = document.createElement("a");
                              link.href = msg.file;
                              // Use the original filename with extension, or generate one based on fileType
                              let downloadName = msg.fileName || "file";
                              
                              // If fileName doesn't have extension, try to get it from fileType
                              if (!downloadName.includes(".") && msg.fileType) {
                                const extension = msg.fileType.split("/")[1] || "bin";
                                downloadName = `file.${extension}`;
                              }
                              
                              link.download = downloadName;
                              link.target = "_blank";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="flex-shrink-0 p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg transition-colors"
                            title="Download file"
                            type="button"
                          >
                            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.text && <p className={msg.image || msg.file ? "mt-2" : ""}>{msg.text}</p>}
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

        // Image Preview Modal
        function ImagePreviewModal({ image, imageFileName, onClose }) {
          if (!image) return null;

          const handleDownload = () => {
            const link = document.createElement("a");
            link.href = image;
            
            // Use the stored filename if available, otherwise extract from URL
            let downloadName = imageFileName;
            if (!downloadName) {
              // Try to get extension from image URL
              let extension = "jpg";
              if (image.includes(".")) {
                const urlParts = image.split(".");
                extension = urlParts[urlParts.length - 1].split("?")[0]; // Remove query params
                // Validate extension
                const validExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
                if (!validExtensions.includes(extension.toLowerCase())) {
                  extension = "jpg";
                }
              }
              downloadName = `image-${Date.now()}.${extension}`;
            }
            
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };

          return (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={onClose}
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <img 
                  src={image} 
                  alt="Preview" 
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700/80 text-white p-2 rounded-full transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                  className="absolute bottom-4 right-4 bg-cyan-500/80 hover:bg-cyan-600/80 text-white p-3 rounded-full transition-colors flex items-center gap-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  <span className="text-sm">Download</span>
                </button>
              </div>
            </div>
          );
        }

        export default ChatContainer;
