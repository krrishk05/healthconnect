import React from 'react';
import { useParams } from 'react-router-dom';
import Chat from './Chat';

const ChatRoom = () => {
  const { appointmentId } = useParams();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <Chat />
    </div>
  );
};

export default ChatRoom; 