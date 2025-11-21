import React from 'react'
import { useAuthStore } from '../store/useAuthStore'

function ChatPage() {
  const { logout } = useAuthStore();
  return (
    <div className="relative z-10 text-white">
      <h1 className="text-3xl font-bold text-white">Chat Page</h1>
      <p className="mt-4 text-gray-300">Welcome to the chat page!</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

export default ChatPage

