import React, { useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import { User } from './src/types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const DeliveryScreen = require('./src/screens/DeliveryScreen').default;

  return (
    <DeliveryScreen
      user={currentUser} 
      onLogout={() => setCurrentUser(null)} 
    />
  );
}
