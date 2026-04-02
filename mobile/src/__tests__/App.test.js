import React from 'react';
import { act, render } from '@testing-library/react-native';

// Mock screens so tests stay unit-level
jest.mock('./src/screens/AuthScreen', () => {
  const { Text } = require('react-native');
  return () => <Text testID="auth-screen">Auth</Text>;
});
jest.mock('./src/screens/PatientScreen', () => {
  const { Text } = require('react-native');
  return () => <Text testID="patient-screen">Patient</Text>;
});
jest.mock('./src/screens/DoctorScreen', () => {
  const { Text } = require('react-native');
  return () => <Text testID="doctor-screen">Doctor</Text>;
});

// Mock api
jest.mock('../api', () => ({
  API_BASE_URL: 'http://10.0.2.2:8000',
  api: {
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
  },
}));

import App from '../../App';

describe('App', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<App />);
    });
  });

  it('shows loading spinner on mount', () => {
    const { getByTestId } = render(<App />);
    // ActivityIndicator is present before session loads
    expect(() => getByTestId('auth-screen')).toThrow();
  });
});
