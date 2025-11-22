import { memo } from "react";

function TypingIndicator({ userName }) {
  return (
    <div className="flex items-center gap-2 text-slate-300 text-sm">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
      </div>
      <span>{userName} is typing...</span>
    </div>
  );
}

export default memo(TypingIndicator);