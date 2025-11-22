import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { ArrowLeft } from "lucide-react";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPageMobile() {
  const { activeTab, selectedUser, setSelectedUser } = useChatStore();
  const [showChat, setShowChat] = useState(false);

  // Show chat when user is selected, hide sidebar
  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      setShowChat(true);
    } else {
      setShowChat(false);
    }
  }, [selectedUser]);

  // Handle back button - hide chat, show sidebar
  const handleBack = (e) => {
    e?.stopPropagation?.();
    setSelectedUser(null);
    setShowChat(false);
  };

  // Override setSelectedUser to also update showChat
  const handleSetSelectedUser = (user) => {
    setSelectedUser(user);
    if (user) {
      setShowChat(true);
    } else {
      setShowChat(false);
    }
  };

  return (
    <div className="relative w-full h-screen max-h-screen overflow-hidden">
      <BorderAnimatedContainer>
        {/* SIDEBAR - Hidden when chat is shown */}
        {!showChat && (
          <div className="w-full h-full bg-slate-800/50 backdrop-blur-sm flex flex-col">
            <div className="flex-shrink-0">
              <ProfileHeader />
            </div>
            <div className="flex-shrink-0">
              <ActiveTabSwitch />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {activeTab === "chats" ? (
                <ChatsList onUserSelect={handleSetSelectedUser} />
              ) : (
                <ContactList onUserSelect={handleSetSelectedUser} />
              )}
            </div>
          </div>
        )}

        {/* CHAT CONTAINER - Shown when user is selected */}
        {showChat && selectedUser && (
          <div className="w-full h-full flex flex-col bg-slate-900/50 backdrop-blur-sm relative">
            <ChatContainer />
          </div>
        )}
      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPageMobile;

