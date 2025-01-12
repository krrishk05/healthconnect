import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { convertTo12Hour, convertTo24Hour } from '../utils/timeFormat';

const Appointments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const doctorId = searchParams.get('doctor');
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleBooking = async (slot) => {
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/appointments`,
                {
                    doctorId: doctorId,
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': localStorage.getItem('token')
                    }
                }
            );
            setSuccess('Appointment booked successfully!');
            // Refresh the available slots
            fetchDoctorAvailability();
            // Navigate back to appointments list after short delay
            setTimeout(() => {
                navigate('/appointments');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error booking appointment');
        }
    };

    const fetchDoctorAvailability = async () => {
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/auth/availability/${doctorId}`,
                {
                    headers: {
                        'x-auth-token': localStorage.getItem('token')
                    }
                }
            );
            setAvailableSlots(response.data || []);
        } catch (error) {
            console.error('Error fetching doctor availability:', error);
            setError('Failed to fetch available time slots');
        }
    };

    const handleBackToAppointments = () => {
        // Clear any existing states
        setAvailableSlots([]);
        setError('');
        setSuccess('');
        // Use navigate with replace to avoid building up history stack
        navigate('/appointments', { replace: true });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user?._id) return;

            try {
                setLoading(true);
                setError('');

                if (user.role === 'doctor') {
                    // Fetch doctor's appointments
                    const appointmentsRes = await axios.get(
                        `${import.meta.env.VITE_API_URL}/api/appointments`,
                        {
                            headers: { 'x-auth-token': localStorage.getItem('token') }
                        }
                    );
                    setAppointments(appointmentsRes.data);
                } else if (doctorId) {
                    // Fetch specific doctor's info and their availability
                    const [doctorRes, availabilityRes] = await Promise.all([
                        axios.get(`${import.meta.env.VITE_API_URL}/api/auth/doctors/${doctorId}`, {
                            headers: { 'x-auth-token': localStorage.getItem('token') }
                        }),
                        axios.get(`${import.meta.env.VITE_API_URL}/api/auth/availability/${doctorId}`, {
                            headers: { 'x-auth-token': localStorage.getItem('token') }
                        })
                    ]);
                    setDoctors([doctorRes.data]);
                    setAvailableSlots(availabilityRes.data);
                } else {
                    // Fetch all doctors and their availabilities
                    const [doctorsRes, appointmentsRes] = await Promise.all([
                        axios.get(
                            `${import.meta.env.VITE_API_URL}/api/auth/doctors`,
                            {
                                headers: { 'x-auth-token': localStorage.getItem('token') }
                            }
                        ),
                        axios.get(
                            `${import.meta.env.VITE_API_URL}/api/appointments`,
                            {
                                headers: { 'x-auth-token': localStorage.getItem('token') }
                            }
                        )
                    ]);

                    // For each doctor, fetch their availabilities
                    const doctorsWithAvailability = await Promise.all(
                        doctorsRes.data.map(async (doctor) => {
                            const availabilityRes = await axios.get(
                                `${import.meta.env.VITE_API_URL}/api/auth/availability/${doctor._id}`,
                                {
                                    headers: { 'x-auth-token': localStorage.getItem('token') }
                                }
                            );
                            return {
                                ...doctor,
                                availableSlots: availabilityRes.data || []
                            };
                        })
                    );

                    setDoctors(doctorsWithAvailability);
                    setAppointments(appointmentsRes.data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setError(error.response?.data?.message || 'Error fetching data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?._id, doctorId]);

    if (!user) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {user.role === 'doctor' ? "My Appointments" : (doctorId ? "Schedule Appointment" : "My Appointments")}
                    </h1>
                    {doctorId && user.role === 'patient' && (
                        <button
                            onClick={handleBackToAppointments}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Back to Appointments
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                        {success}
                    </div>
                )}

                {user.role === 'doctor' ? (
                    // Doctor's appointments view
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        {appointments.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {appointments.map((appointment) => (
                                    <li key={appointment._id} className="px-4 py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Patient: {appointment.patient.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Date: {format(new Date(appointment.date), 'PPP')}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Time: {convertTo12Hour(appointment.startTime)} - {convertTo12Hour(appointment.endTime)}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Status: {appointment.status}
                                                </p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => navigate(`/chat/${appointment._id}`)}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    Chat
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="px-4 py-5 text-center text-gray-500">
                                No appointments scheduled
                            </div>
                        )}
                    </div>
                ) : (
                    // Show existing appointments and doctor list
                    <div>
                        {/* Show patient's appointments */}
                        <div className="mb-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Appointments</h2>
                            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                {appointments.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {appointments.map((appointment) => (
                                            <li key={appointment._id} className="px-4 py-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            Dr. {appointment.doctor.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            Date: {format(new Date(appointment.date), 'PPP')}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            Time: {convertTo12Hour(appointment.startTime)} - {convertTo12Hour(appointment.endTime)}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            Status: {appointment.status}
                                                        </p>
                                                    </div>
                                                    {appointment.status === 'scheduled' && (
                                                        <button
                                                            onClick={() => navigate(`/chat/${appointment._id}`)}
                                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                        >
                                                            Chat
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-4 py-5 text-center text-gray-500">
                                        No appointments scheduled
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Available Doctors Section */}
                        <div className="mt-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Available Doctors</h2>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {doctors.map((doctor) => (
                                    <div key={doctor._id} className="bg-white overflow-hidden shadow rounded-lg">
                                        <div className="px-4 py-5 sm:p-6">
                                            <h3 className="text-lg font-medium text-gray-900">Dr. {doctor.name}</h3>
                                            {doctor.specialization && (
                                                <p className="mt-1 text-sm text-gray-500">{doctor.specialization}</p>
                                            )}
                                            <p className="mt-1 text-sm text-gray-500">{doctor.email}</p>

                                            {/* Show available slots count */}
                                            <p className="mt-2 text-sm text-gray-500">
                                                {doctor.availableSlots.length > 0
                                                    ? `${doctor.availableSlots.length} time slot${doctor.availableSlots.length === 1 ? '' : 's'} available`
                                                    : 'No available time slots'}
                                            </p>

                                            <div className="mt-4">
                                                {doctor.availableSlots.length > 0 ? (
                                                    <button
                                                        onClick={() => navigate(`/appointments?doctor=${doctor._id}`)}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                    >
                                                        View Available Times
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
                                                    >
                                                        No Availability
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Appointments; 