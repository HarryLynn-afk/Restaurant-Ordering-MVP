import { useState, useEffect } from 'react';
import { subscribeToSettings } from '../services/settings';

const useSettings = () => {
  const [settings, setSettings] = useState(null);
  useEffect(() => subscribeToSettings(setSettings), []);
  return { settings };
};

export default useSettings;
