import { useCrudFactory } from './useCrudFactory';
import { Contract } from '@/types/database';

const contractsCrud = useCrudFactory<'contracts', Contract>({
  table: 'contracts',
  queryKey: 'contracts',
  select: '*, property:properties(*), unit:units(*)',
  label: 'العقد',
});

export const useContracts = contractsCrud.useList;
export const useCreateContract = contractsCrud.useCreate;
export const useUpdateContract = contractsCrud.useUpdate;
export const useDeleteContract = contractsCrud.useDelete;
