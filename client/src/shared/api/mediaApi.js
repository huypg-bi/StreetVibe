import { apiClient } from "./apiClient";

export async function uploadImage(imageFile) {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await apiClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data?.data;
}
