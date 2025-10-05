import React from 'react';
import { useSocket } from '../context/useSocketHook';

const UserList = () => {
  const { users, currentUser } = useSocket();

  return (
    <div className="user-list-sidebar">
      <h3>Online Users ({users.length})</h3>
      <div className="user-list">
        {users.map(user => (
          <div key={user.id} className="user-item">
            <span className="user-status"></span>
            <span className="username">{user.username}</span>
            {user.id === currentUser?.id && <span className="you-badge">You</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;