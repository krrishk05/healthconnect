import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { convertTo12Hour } from '../utils/timeFormat';

const Dashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    upcoming: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all appointments including cancelled ones
        const appointmentsRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/appointments/all`
        );
        
        const allAppointments = appointmentsRes.data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter appointments for doctors
        if (user?.role === 'doctor') {
          // Get today's appointments
          const todayAppts = allAppointments.filter(apt => {
            const aptDate = new Date(apt.date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate.getTime() === today.getTime() && apt.status === 'scheduled';
          });

          // Get upcoming appointments (future dates, excluding today)
          const upcomingAppts = allAppointments.filter(apt => {
            const aptDate = new Date(apt.date);
            aptDate.setHours(0, 0, 0, 0);
            return aptDate > today && apt.status === 'scheduled';
          });

          // Calculate stats
          setStats({
            total: allAppointments.length,
            today: todayAppts.length,
            upcoming: upcomingAppts.length,
            cancelled: allAppointments.filter(apt => apt.status === 'cancelled').length
          });

          setTodayAppointments(todayAppts);
          setUpcomingAppointments(upcomingAppts);
        }

        setAppointments(allAppointments);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (!user || loading) {
    return <div>Loading...</div>;
  }

  // Doctor's dashboard view
  if (user.role === 'doctor') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Today's Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.today}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.upcoming}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Cancelled Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.cancelled}</dd>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Today's Appointments</h2>
            {todayAppointments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {todayAppointments.map((appointment) => (
                  <li key={appointment._id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Patient: {appointment.patient.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Time: {appointment.startTime} - {appointment.endTime}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No appointments scheduled for today</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/availability"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Manage Availability
              </Link>
              <Link
                to={`/appointments?doctor=${user._id}`}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                View All Appointments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Patient's dashboard view
  if (user.role === 'patient') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {appointments.length}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {appointments.filter(apt => new Date(apt.date) > new Date()).length}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Past Appointments</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {appointments.filter(apt => new Date(apt.date) <= new Date()).length}
              </dd>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Appointments</h2>
            {appointments.filter(apt => new Date(apt.date) > new Date()).length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {appointments
                  .filter(apt => new Date(apt.date) > new Date())
                  .map((appointment) => (
                    <li key={appointment._id} className="py-4">
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
                        </div>
                        <button
                          onClick={() => navigate(`/chat/${appointment._id}`)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Chat
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500">No upcoming appointments</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/appointments"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Book Appointment
              </Link>
              <Link
                to="/medical-assistant"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Medical Assistant
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default Dashboard; 