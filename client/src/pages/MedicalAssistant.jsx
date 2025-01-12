import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const MedicalAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Redirect if not a patient
  if (!user) {
    return <div>Loading...</div>;
  }

  if (user.role !== 'patient') {
    return <Navigate to="/" replace />;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: newMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat/assistant`,
        { 
          message: newMessage,
          chatHistory: messages // Send chat history
        }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.data.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Medical Assistant</h1>
                <button
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Send Chat Summary to Doctor
                </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg">
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`mb-4 ${
                                message.role === 'user' ? 'text-right' : 'text-left'
                            }`}
                        >
                            <div
                                className={`inline-block px-4 py-2 rounded-lg ${
                                    message.role === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-gray-200 p-4">
                    <form onSubmit={handleSubmit} className="flex space-x-4">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={loading}
                            className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Type your message..."
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                                loading
                                    ? 'bg-indigo-400'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                        >
                            {loading ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MedicalAssistant; 