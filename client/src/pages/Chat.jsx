import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import { useSocket } from '../hooks/useSocket';

export default function Chat() {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  useSocket();

  return (
    <div className="h-screen flex overflow-hidden bg-gray-950">
      <Sidebar onNewGroup={() => setShowCreateGroup(true)} />
      <ChatArea />
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </div>
  );
}
