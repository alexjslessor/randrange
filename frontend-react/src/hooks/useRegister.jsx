import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authClient';
import { getApiErrorMessage } from '@/utils/apiError';

const useRegister = () => {
  const api = authApi();
  return useMutation({
      mutationFn: async (credentials) => {
        try {
          const response = await api.register(credentials);
          return response.data;
        } catch (error) {
          throw new Error(getApiErrorMessage(error, 'Registration failed'));
        }
      },
      onError: (error) => {
          console.error(`Register failed: ${error.message}`);
      },
      onSuccess: (data) => {
          console.log('Register successful:', data);
      },
      onSettled: () => {
          console.log('Register attempt finished.');
      },
  });
};

export { useRegister }
