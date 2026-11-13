export const uploadImageToCloudinary = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'ml_default');

  try {
    const response = await fetch(
      'https://api.cloudinary.com/v1_1/dh5pjhxgn/image/upload',
      { method: 'POST', body: formData },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Cloudinary error: ${errorData.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();
    if (!data.secure_url) throw new Error('Cloudinary did not return secure_url');
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};
