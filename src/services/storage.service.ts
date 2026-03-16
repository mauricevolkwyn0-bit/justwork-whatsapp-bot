import { supabase } from "./supabase.service";

type DocumentType = "cv" | "id-copy" | "drivers-license" | "certificates";
type RecruitmentAssetType = "logo" | "registration-docs" | "contracts";

// ── CANDIDATE DOCUMENTS ───────────────────────────────────

export const uploadCandidateDocument = async (
  candidateId: string,
  documentType: DocumentType,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> => {
  const filePath = `${candidateId}/${documentType}/${fileName}`;

  const { error } = await supabase.storage
    .from("candidate-documents")
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  return filePath;
};

export const getCandidateDocumentUrl = async (
  candidateId: string,
  documentType: DocumentType,
  fileName: string
): Promise<string> => {
  const filePath = `${candidateId}/${documentType}/${fileName}`;

  const { data } = await supabase.storage
    .from("candidate-documents")
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (!data) throw new Error("Could not generate signed URL");

  return data.signedUrl;
};

export const deleteCandidateDocument = async (
  candidateId: string,
  documentType: DocumentType,
  fileName: string
): Promise<void> => {
  const filePath = `${candidateId}/${documentType}/${fileName}`;

  const { error } = await supabase.storage
    .from("candidate-documents")
    .remove([filePath]);

  if (error) throw error;
};

// ── RECRUITMENT ASSETS ────────────────────────────────────

export const uploadRecruitmentAsset = async (
  companyId: string,
  assetType: RecruitmentAssetType,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> => {
  const filePath = `${companyId}/${assetType}/${fileName}`;

  const { error } = await supabase.storage
    .from("recruitment-assets")
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  return filePath;
};

export const getRecruitmentAssetUrl = async (
  companyId: string,
  assetType: RecruitmentAssetType,
  fileName: string
): Promise<string> => {
  const filePath = `${companyId}/${assetType}/${fileName}`;

  const { data } = await supabase.storage
    .from("recruitment-assets")
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (!data) throw new Error("Could not generate signed URL");

  return data.signedUrl;
};