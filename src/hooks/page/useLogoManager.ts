import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET_NAME = 'waqf_documents';

export const useLogoManager = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch current logo setting
  const { data: logoUrl, isLoading } = useQuery({
    queryKey: ['app_settings', 'logo_url'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data?.value || null;
    },
  });

  // Upload logo mutation
  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      try {
        // Upload to storage
        const fileExtension = file.name.split('.').pop();
        const fileName = `logo.${fileExtension}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        const publicUrl = data.publicUrl;

        // Save URL to settings
        const { error: settingsError } = await supabase
          .from('app_settings')
          .upsert(
            { key: 'logo_url', value: publicUrl, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (settingsError) throw settingsError;

        return publicUrl;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      toast.success('تم رفع الشعار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['app_settings', 'logo_url'] });
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الشعار';
      toast.error(errorMessage);
    },
  });

  // Delete logo mutation
  const deleteLogo = useMutation({
    mutationFn: async () => {
      setDeleting(true);
      try {
        // Delete from settings
        const { error: settingsError } = await supabase
          .from('app_settings')
          .delete()
          .eq('key', 'logo_url');

        if (settingsError) throw settingsError;

        // Try to delete from storage (non-blocking if fails)
        try {
          await supabase.storage.from(BUCKET_NAME).remove(['logos/logo.png']);
        } catch {
          // Ignore storage deletion errors
        }
      } finally {
        setDeleting(false);
      }
    },
    onSuccess: () => {
      toast.success('تم حذف الشعار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['app_settings', 'logo_url'] });
      queryClient.invalidateQueries({ queryKey: ['app_settings'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الشعار';
      toast.error(errorMessage);
    },
  });

  const handleUpload = async (file: File) => {
    await uploadLogo.mutateAsync(file);
  };

  const handleDelete = async () => {
    await deleteLogo.mutateAsync();
  };

  return {
    isLoading,
    logoUrl: logoUrl as string | null,
    uploading: uploading || uploadLogo.isPending,
    deleting: deleting || deleteLogo.isPending,
    handleUpload,
    handleDelete,
  };
};
