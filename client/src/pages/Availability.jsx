import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { convertTo12Hour } from '../utils/timeFormat';

const Availability = () => {
  const { user } = useAuth();
  const [availabilityData, setAvailabilityData] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [availabilities, setAvailabilities] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      if (!user?._id) return;
      
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/auth/availability/${user._id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': localStorage.getItem('token')
            }
          }
        );
        setAvailabilities(response.data || []);
        setError('');
      } catch (error) {
        console.error('Error fetching availabilities:', error);
        setError(error.response?.data?.message || 'Failed to fetch availabilities');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user?._id]);

  // Show loading state while user data is being fetched
  if (!user) {
    return <div>Loading...</div>;
  }

  // Redirect if not a doctor
  if (user.role !== 'doctor') {
    return <Navigate to="/" replace />;
  }

  // Only show loading spinner if we're fetching availabilities
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/availability`,
        {
          ...availabilityData,
          doctorId: user._id
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          }
        }
      );
      setSuccess('Availability added successfully!');
      setAvailabilities(response.data);
      setAvailabilityData({ date: '', startTime: '', endTime: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding availability');
    }
  };

  const handleDelete = async (availabilityId) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/auth/availability/${availabilityId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token')
          }
        }
      );
      setAvailabilities(response.data);
      setSuccess('Availability deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting availability');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Manage Availability</h1>

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

        {/* Add Availability Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={availabilityData.date}
              onChange={(e) => setAvailabilityData({ ...availabilityData, date: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={availabilityData.startTime}
                onChange={(e) => setAvailabilityData({ ...availabilityData, startTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={availabilityData.endTime}
                onChange={(e) => setAvailabilityData({ ...availabilityData, endTime: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Availability
            </button>
          </div>
        </form>

        {/* Current Availabilities List */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current Availabilities</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {availabilities.map((availability) => (
                <li key={availability._id}>
                  <div className="px-4 py-4 flex items-center justify-between sm:px-6">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(availability.date), 'PPP')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {convertTo12Hour(availability.startTime)} - {convertTo12Hour(availability.endTime)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(availability._id)}
                      className="ml-4 text-sm text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {availabilities.length === 0 && (
                <li>
                  <div className="px-4 py-4 text-center text-gray-500 sm:px-6">
                    No availabilities set
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Availability; 