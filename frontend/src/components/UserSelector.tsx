import { useUser } from '../context/UserContext';

export const UserSelector = () => {
  const { currentUser, availableUsers, selectUserById } = useUser();

  const isPatient = currentUser.role === 'PATIENT';

  return (
    <div className="user-selector-container">
      <div className="user-select-group">
        <label htmlFor="caller-select" className="user-select-label">
          Demo User (Testing):
        </label>
        <select
          id="caller-select"
          className="user-select-dropdown"
          value={currentUser.id}
          onChange={(e) => selectUserById(Number(e.target.value))}
          aria-label="Select demo caller to test permissions"
        >
          <optgroup label="Demo Patients (Test booking & own appointments)">
            {availableUsers.filter((u) => u.role === 'PATIENT').map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · Patient
              </option>
            ))}
          </optgroup>
          <optgroup label="Demo Reception (Test clinic-wide schedule management)">
            {availableUsers.filter((u) => u.role === 'RECEPTION').map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · Reception
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <span
        className={`badge ${isPatient ? 'badge-patient' : 'badge-reception'}`}
        title={`Current demo role: ${currentUser.role}`}
      >
        {isPatient ? 'Patient' : 'Reception'}
      </span>
    </div>
  );
};
