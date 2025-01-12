import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Chat from './pages/Chat';
import Availability from './pages/Availability';
import MedicalAssistant from './pages/MedicalAssistant';

function App() {
    return (
        <Router>
            <AuthProvider>
                <div className="min-h-screen bg-gray-100">
                    <Navbar />
                    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route
                                path="/"
                                element={
                                    <PrivateRoute>
                                        <Dashboard />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/appointments"
                                element={
                                    <PrivateRoute>
                                        <Appointments />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/chat/:appointmentId"
                                element={
                                    <PrivateRoute>
                                        <Chat />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/availability"
                                element={
                                    <PrivateRoute>
                                        <Availability />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/medical-assistant"
                                element={
                                    <PrivateRoute>
                                        <MedicalAssistant />
                                    </PrivateRoute>
                                }
                            />
                        </Routes>
                    </div>
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App; 