import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import { convertTo12Hour } from '../utils/timeFormat';

const Chat = () => {
    const { appointmentId } = useParams();
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [appointment, setAppointment] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const typingTimeoutRef = useRef(null);

    // Fetch appointment data
    useEffect(() => {
        const fetchAppointment = async () => {
            if (!appointmentId || !user) {
                navigate('/');
                return;
            }

            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/appointments/${appointmentId}`,
                    {
                        headers: { 'x-auth-token': localStorage.getItem('token') }
                    }
                );

                const appointmentData = response.data;

                if (!appointmentData.patient || !appointmentData.doctor) {
                    alert('Invalid appointment data');
                    navigate('/');
                    return;
                }

                // Ensure that user.id is correctly defined (use _id if needed)
                const userId = user.id || user._id;
                const patientId = appointmentData.patient._id || appointmentData.patient;
                const doctorId = appointmentData.doctor._id || appointmentData.doctor;

                if (patientId.toString() !== userId.toString() &&
                    doctorId.toString() !== userId.toString()) {
                    alert('Not authorized to view this appointment');
                    navigate('/');
                    return;
                }

                setAppointment(appointmentData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching appointment:', error.response ? error.response.data : error.message);
                alert('Error loading appointment');
                navigate('/');
            }
        };

        fetchAppointment();
    }, [appointmentId, user, navigate]);

    // Initialize Socket.IO
    useEffect(() => {
        if (!appointmentId || !user) return;

        const newSocket = io(import.meta.env.VITE_API_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            auth: {
                token: localStorage.getItem('token')
            }
        });

        setSocket(newSocket);

        // Connect and join the chat room
        newSocket.on('connect', () => {
            console.log('Socket connected');
            newSocket.emit('join_chat', { appointmentId, userId: user.id || user._id });
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Cleanup on unmount
        return () => {
            if (newSocket) {
                console.log('Disconnecting socket');
                newSocket.disconnect();
            }
        };
    }, [appointmentId, user]);

    // Add separate useEffect for message handling
    useEffect(() => {
        if (!socket || !appointmentId) return;

        // Fetch existing messages
        const fetchMessages = async () => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/messages/${appointmentId}`,
                    {
                        headers: { 'x-auth-token': localStorage.getItem('token') }
                    }
                );
                setMessages(response.data);
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchMessages();

        // Handle received messages
        const handleReceiveMessage = (message) => {
            console.log('Received message:', message);
            setMessages(prev => [...prev, message]);
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert('Error sending message. Please try again.');
        });

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('error');
        };
    }, [socket, appointmentId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        try {
            const userId = user.id || user._id;
            const messageData = {
                appointmentId,
                content: newMessage.trim(),
                senderId: userId
            };

            console.log('Sending message:', messageData);
            socket.emit('send_message', messageData);
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    };

    // Add scroll to bottom effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!appointment) {
        return <div>Error loading appointment</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900">
                        Chat with {user.role === 'patient' ? `Dr. ${appointment.doctor.name}` : appointment.patient.name}
                    </h2>
                    <div className="mt-2 text-sm text-gray-500">
                        <p>Date: {format(new Date(appointment.date), 'PPP')}</p>
                        <p>Time: {convertTo12Hour(appointment.startTime)} - {convertTo12Hour(appointment.endTime)}</p>
                        <p>Status: {appointment.status}</p>
                    </div>
                </div>
                {/* Chat Messages */}
                <div className="px-4 py-5 sm:p-6 h-96 overflow-y-scroll">
                    {messages.map((message, index) => {
                        // Convert both IDs to strings and ensure we're using the correct ID format
                        const currentUserId = (user.id || user._id).toString();
                        const messageSenderId = (message.sender?._id || message.sender || message.senderId).toString();
                        const isSentByMe = currentUserId === messageSenderId;
                        
                        console.log('Message comparison:', {
                            currentUserId,
                            messageSenderId,
                            isSentByMe
                        });

                        return (
                            <div
                                key={message._id || index}
                                className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} mb-4`}
                            >
                                <div
                                    className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                        isSentByMe
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                    }`}
                                >
                                    <p>{message.content}</p>
                                    {message.timestamp && (
                                        <p className="text-xs mt-1 opacity-75">
                                            {format(new Date(message.timestamp), 'p')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
                {/* Typing Indicator */}
                {isTyping && <p className="px-4 text-sm text-gray-500">Someone is typing...</p>}
                {/* Message Input */}
                <div className="px-4 py-4 sm:p-6">
                    <form onSubmit={handleSubmit} className="flex space-x-4">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Type your message..."
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${loading
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
    );
};

export default Chat; 