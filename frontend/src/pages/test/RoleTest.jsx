import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROLE_HIERARCHY } from '../../constants/roles';

const RoleTest = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(ROLES.USER);
  const [simulatedUser, setSimulatedUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Current user:', user);
    console.log('Simulated user:', simulatedUser);
  }, [user, simulatedUser]);

  const handleLogin = () => {
    try {
      console.log('Logging in with role:', selectedRole);
      setSimulatedUser({
        id: '1',
        email: 'test@example.com',
        role: selectedRole
      });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  const handleLogout = () => {
    try {
      setSimulatedUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  };

  // Use simulated user for role checks if available
  const effectiveUser = simulatedUser || user;

  const checkRole = (role) => {
    try {
      if (!effectiveUser?.role) return false;
      const userRole = effectiveUser.role;
      const hasRole = ROLE_HIERARCHY[userRole]?.includes(role) || false;
      console.log(`Checking role ${role} for user ${userRole}:`, hasRole);
      return hasRole;
    } catch (err) {
      console.error('Role check error:', err);
      return false;
    }
  };

  const checkAnyRole = (roles) => {
    try {
      if (!effectiveUser?.role) return false;
      return roles.some(role => checkRole(role));
    } catch (err) {
      console.error('Any role check error:', err);
      return false;
    }
  };

  const checkAllRoles = (roles) => {
    try {
      if (!effectiveUser?.role) return false;
      return roles.every(role => checkRole(role));
    } catch (err) {
      console.error('All roles check error:', err);
      return false;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p>{error}</p>
        <button
          onClick={() => setError(null)}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Clear Error
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Role Testing Page</h1>

      {/* Role Selection */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Current User</h2>
        <div className="mb-4">
          <p>Status: {effectiveUser ? 'Logged In' : 'Not Logged In'}</p>
          {effectiveUser && <p>Current Role: {effectiveUser.role}</p>}
        </div>

        <div className="mb-4">
          <label className="block mb-2">Select Role to Test:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border p-2 rounded"
          >
            {Object.values(ROLES).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="space-x-4">
          <button
            onClick={handleLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Simulate Login as Selected Role
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Simulate Logout
          </button>
        </div>
      </div>

      {/* Role Checks */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Role Checks</h2>
        
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Single Role Check</h3>
          {Object.values(ROLES).map((role) => (
            <div key={role} className="mb-2">
              <p>
                hasRole({role}):{' '}
                <span className={checkRole(role) ? 'text-green-500' : 'text-red-500'}>
                  {checkRole(role).toString()}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">Multiple Role Checks</h3>
          <p>
            hasAnyRole([{ROLES.MANAGER}, {ROLES.ADMIN}]):{' '}
            <span
              className={
                checkAnyRole([ROLES.MANAGER, ROLES.ADMIN])
                  ? 'text-green-500'
                  : 'text-red-500'
              }
            >
              {checkAnyRole([ROLES.MANAGER, ROLES.ADMIN]).toString()}
            </span>
          </p>
          <p>
            hasAllRoles([{ROLES.USER}, {ROLES.EMPLOYEE}]):{' '}
            <span
              className={
                checkAllRoles([ROLES.USER, ROLES.EMPLOYEE])
                  ? 'text-green-500'
                  : 'text-red-500'
              }
            >
              {checkAllRoles([ROLES.USER, ROLES.EMPLOYEE]).toString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleTest; 