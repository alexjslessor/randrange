import { useAxios } from './useAxios';
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

const useDelete = () => {
  const queryClient = useQueryClient();
  const axiosInstance = useAxios();

  const deleteOne = async ({collection_name, id}) => {
    // console.log('deleteOne:', collection_name, id);
    try {
      const response = await axiosInstance({
        method: 'DELETE',
        url: '/api/delete',
        params: {
          collection_name: collection_name,
          id: id
        },
      });
      return response.data;
    } catch (e) {
      throw new Error(e.response?.data || e.message);
    }
  };
  return useMutation({
    mutationFn: deleteOne,
    // mutationFn: ({ collection_name, id }) => deleteOne(collection_name, id),
    onSuccess: (_, { collection_name }) => {
      console.log('Delete successful - invalidating..: ', collection_name);
      // Invalidate queries related to the collection to refresh data
      queryClient.invalidateQueries({ queryKey: [collection_name] });
    },
    onError: (error) => {
      console.error('Error deleting item:', error.message);
    },
    onSettled: () => {
      console.log('onSettled: Deletion attempt finished.');
    }
  });
};

export { useDelete };