"use server";

import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import type { Result } from "@/types";
import { logger } from "./logger";

export async function createPresignedUpload(data: {
  workspace_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  scope?: string;
}): Promise<Result<{ upload_url: string; file_id: string; public_url: string }>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/storage/presign-upload`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al generar URL de subida" };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    logger.error("Error creating presigned upload:", error);
    return { success: false, error: "Error de conexión al servidor de almacenamiento" };
  }
}

export async function completeUpload(data: {
  file_id: string;
  workspace_id: string;
}): Promise<Result<{ success: boolean; file: any; signed_url?: string }>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/storage/complete-upload`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al completar la subida" };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    logger.error("Error completing upload:", error);
    return { success: false, error: "Error al confirmar la subida" };
  }
}

export async function getFileUrl(fileId: string): Promise<Result<{ url: string }>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/storage/files/${fileId}/url`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener URL del archivo" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching file url:", error);
    return { success: false, error: "Error al obtener URL del archivo" };
  }
}

export async function uploadFileDirectly(formData: FormData): Promise<Result<{ success: boolean; file: any; public_url: string; signed_url: string }>> {
  try {
    const headers = await getAuthHeaders();
    // FormData usually shouldn't have Content-Type set manually when using fetch
    // fetch will automatically set it to multipart/form-data with the correct boundary
    // But we need to remove 'Content-Type': 'application/json' from getAuthHeaders if it exists
    const cleanHeaders = { ...headers };
    delete cleanHeaders['Content-Type'];

    const response = await fetch(`${API_URL}/storage/upload`, {
      method: "POST",
      headers: cleanHeaders,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al subir el archivo" };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    logger.error("Error uploading file directly:", error);
    return { success: false, error: "Error de conexión al subir el archivo" };
  }
}
