import { useRef, useState, useEffect } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, FileIcon, DownloadIcon, EyeIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFileName, setImageFileName] = useState(null); // Store image filename
  const [filePreview, setFilePreview] = useState(null); // { file, fileName, fileType, fileSize }
  const [isDisappearing, setIsDisappearing] = useState(false);
  const typingTimeoutRef = useRef(null);

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled, selectedUser, emitTypingStart, emitTypingStop } = useChatStore();

  // Don't render if no user is selected
  if (!selectedUser) {
    return null;
  }

  // Handle typing indicator
  useEffect(() => {
    if (!selectedUser) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If user is typing, emit typing-start
    if (text.trim()) {
      emitTypingStart(selectedUser._id);

      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStop(selectedUser._id);
      }, 3000);
    } else {
      // If text is empty, stop typing immediately
      emitTypingStop(selectedUser._id);
    }

    // Cleanup on unmount or when selectedUser changes
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedUser) {
        emitTypingStop(selectedUser._id);
      }
    };
  }, [text, selectedUser, emitTypingStart, emitTypingStop]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    // Check if users are friends
    if (!selectedUser.isFriend) {
      toast.error(`You must be friends with ${selectedUser.fullName} to send messages. Send a friend request first!`);
      return;
    }

    if (isSoundEnabled) playRandomKeyStrokeSound();

    // Stop typing indicator when message is sent
    if (selectedUser) {
      emitTypingStop(selectedUser._id);
    }

    sendMessage({
      text: text.trim(),
      image: imagePreview,
      imageFileName: imagePreview ? imageFileName : null, // Include image filename
      file: filePreview?.file,
      fileName: filePreview?.fileName,
      fileType: filePreview?.fileType,
      fileSize: filePreview?.fileSize,
      isDisappearing: isDisappearing && imagePreview ? true : false, // Only for images
    });
    setText("");
    setImagePreview(null);
    setImageFileName(null);
    setFilePreview(null);
    setIsDisappearing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (20MB = 20 * 1024 * 1024 bytes)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 20MB");
      return;
    }

    // If it's an image, use image preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageFileName(file.name); // Store image filename with extension
        setFilePreview(null); // Clear file preview if image
      };
      reader.readAsDataURL(file);
    } else {
      // For other file types, store file info
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview({
          file: reader.result, // base64
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
        setImagePreview(null); // Clear image preview if file
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setImagePreview(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="p-3 md:p-4 border-t border-slate-700/50">
      {(imagePreview || filePreview) && (
        <div className="max-w-3xl mx-auto mb-2 md:mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-700"
                />
                {isDisappearing && (
                  <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                    <EyeIcon className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ) : filePreview ? (
              <div className="w-20 h-20 bg-slate-700/50 rounded-lg border border-slate-700 flex flex-col items-center justify-center p-2">
                <FileIcon className="w-8 h-8 text-slate-400 mb-1" />
                <p className="text-xs text-slate-300 truncate w-full text-center" title={filePreview.fileName}>
                  {filePreview.fileName}
                </p>
                <p className="text-xs text-slate-500">{formatFileSize(filePreview.fileSize)}</p>
              </div>
            ) : null}
            <button
              onClick={removeFile}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          {imagePreview && (
            <button
              onClick={() => setIsDisappearing(!isDisappearing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                isDisappearing
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  : "bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700/70"
              }`}
              type="button"
              title="Send as disappearing photo (view once)"
            >
              <EyeIcon className="w-3 h-3" />
              <span>{isDisappearing ? "View once" : "View once"}</span>
            </button>
          )}
        </div>
      )}

              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-2 md:space-x-4">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    isSoundEnabled && playRandomKeyStrokeSound();
                  }}
                  className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-3 md:px-4 text-sm md:text-base"
                  placeholder="Type your message..."
                />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg px-3 md:px-4 py-2 transition-colors touch-manipulation ${
                    (imagePreview || filePreview) ? "text-cyan-500" : ""
                  }`}
                  title="Attach file (max 20MB)"
                >
                  <FileIcon className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() && !imagePreview && !filePreview}
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-3 md:px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <SendIcon className="w-4 h-4 md:w-5 md:h-5" />
                </button>
      </form>
    </div>
  );
}
export default MessageInput;
