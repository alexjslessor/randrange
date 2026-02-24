import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../api/adminClient';
import { useAxios } from './useAxios';

const useRotateAdminSigningKey = () => {
  const axiosInstance = useAxios();
  return useMutation({
    mutationFn: () => adminApi(axiosInstance).rotateAdminSigningKey(),
  });
};

export {
  useRotateAdminSigningKey,
};
