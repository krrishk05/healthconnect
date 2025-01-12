import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { convertTo12Hour } from '../utils/timeFormat';

const Chat = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId || !user) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/appointments/${appointmentId}`);
        
        // Check if user is authorized to view this appointment
        if (!response.data.patient || !response.data.doctor) {
          alert('Invalid appointment data');
          navigate('/');
          return;
        }

        if (response.data.patient._id.toString() !== user.id.toString() && 
            response.data.doctor._id.toString() !== user.id.toString()) {
          alert('Not authorized to view this appointment');
          navigate('/');
          return;
        }
        
        setAppointment(response.data);
      } catch (error) {
        console.error('Error fetching appointment:', error);
        if (error.response?.status === 404) {
          alert('Appointment not found');
        } else if (error.response?.status === 403) {
          alert('Not authorized to view this appointment');
        } else {
          alert('Error loading appointment');
        }
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId, navigate, user]);

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
      content: newMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat/${appointmentId}`,
        { message: newMessage }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.data.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">
            Appointment Details
          </h2>
          <div className="mt-2 text-sm text-gray-500">
            <p>Date: {format(new Date(appointment.date), 'PPP')}</p>
            <p>Time: {convertTo12Hour(appointment.startTime)} - {convertTo12Hour(appointment.endTime)}</p>
            <p>Status: {appointment.status}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-96 overflow-y-auto">
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

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="flex space-x-4">
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat; 