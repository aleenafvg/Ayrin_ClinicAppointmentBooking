import { useUser } from '../context/UserContext';

export const UserSelector = () => {
  const { currentUser, availableUsers, selectUserById } = useUser();

  const isPatient = currentUser.role === 'PATIENT';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="caller-select" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4a5568' }}>
          Active Caller (X-User-Id):
        </label>
        <select
          id="caller-select"
          value={currentUser.id}
          onChange={(e) => selectUserById(Number(e.target.value))}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e0',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff',
            color: '#2d3748',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <optgroup label="Patients (Can book & view own appointments)">
            {availableUsers.filter((u) => u.role === 'PATIENT').map((u) => (
              <option key={u.id} value={u.id}>
                ID {u.id}: {u.name} (Patient)
              </option>
            ))}
          </optgroup>
          <optgroup label="Reception Staff (Can manage all appointments)">
            {availableUsers.filter((u) => u.role === 'RECEPTION').map((u) => (
              <option key={u.id} value={u.id}>
                ID {u.id}: {u.name} (Reception)
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
          backgroundColor: isPatient ? '#e6fffa' : '#faf5ff',
          color: isPatient ? '#234e52' : '#553c9a',
          border: `1px solid ${isPatient ? '#81e6d9' : '#d6bcfa'}`,
        }}
      >
        {currentUser.role}
      </span>
    </div>
  );
};

