import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PlayIcon,
  LinkIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface MaterialUploadProps {
  courseId: string;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

interface UploadFormData {
  title: string;
  type: 'document' | 'video' | 'note' | 'link';
  description: string;
  isFree: boolean;
  file: File | null;
  url: string;
  gdriveLink: string;
}

// Convert Google Drive sharing links to a direct preview/view link
const normalizeGDriveLink = (link: string): string => {
  // Match: https://drive.google.com/file/d/FILE_ID/...
  const fileMatch = link.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }
  // Match: https://drive.google.com/open?id=FILE_ID
  const openMatch = link.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }
  return link; // Return as-is if format is unknown
};

const MaterialUpload = ({ courseId, onUploadSuccess, onCancel }: MaterialUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    type: 'document',
    description: '',
    isFree: false,
    file: null,
    url: '',
    gdriveLink: ''
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }

      setFormData({
        ...formData,
        file,
        title: formData.title || file.name.split('.')[0]
      });
    }
  };

  const uploadFile = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', 'course-material');

    const uploadResponse = await axios.post('/api/upload', uploadFormData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.total
          ? (progressEvent.loaded / progressEvent.total) * 100
          : 0;
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
      }
    });

    return uploadResponse.data.filePath;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.file && !formData.url.trim() && !formData.gdriveLink.trim()) {
      toast.error('Please upload a file, provide a URL, or enter a Google Drive link');
      return;
    }

    setUploading(true);

    try {
      let materialUrl = formData.url;
      let filename = '';
      let materialType = formData.type;

      // Priority: GDrive link > File upload > Manual URL
      if (formData.gdriveLink.trim()) {
        materialUrl = normalizeGDriveLink(formData.gdriveLink.trim());
        filename = '';
        materialType = 'document';
      } else if (formData.file) {
        materialUrl = await uploadFile(formData.file);
        filename = formData.file.name;
      }

      // Create material entry
      const materialData = {
        title: formData.title.trim(),
        type: materialType,
        url: materialUrl,
        filename,
        description: formData.description.trim(),
        isFree: formData.isFree
      };

      await axios.post(`/api/courses/${courseId}/material`, materialData);

      toast.success('Material uploaded successfully!');
      onUploadSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  const getPreviewIcon = () => {
    switch (formData.type) {
      case 'video': return PlayIcon;
      case 'link': return LinkIcon;
      default: return DocumentIcon;
    }
  };

  const PreviewIcon = getPreviewIcon();

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Upload Course Material</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input"
            placeholder="Enter material title"
            required
          />
        </div>

        {/* Google Drive Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload via Google Drive
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="url"
                value={formData.gdriveLink}
                onChange={(e) => setFormData({ ...formData, gdriveLink: e.target.value, file: null })}
                className="input pl-10"
                placeholder="https://drive.google.com/file/d/.../view"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L29 52.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                <path d="M43.65 25l-15.25-26.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 43.7A8.9 8.9 0 0 0 0 48.2h29z" fill="#00ac47" />
                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L84.7 60l-22-38h-29l14.65 25.35z" fill="#ea4335" />
                <path d="M43.65 25L58.9 0H29a8.88 8.88 0 0 0-4.55 1.2l14.65 25.35 4.55-1.55z" fill="#00832d" />
                <path d="M58.3 52.2H29l-15.25 26.4c1.35.8 2.9 1.2 4.55 1.2H69c1.65 0 3.2-.4 4.55-1.2z" fill="#2684fc" />
                <path d="M73.4 26.5L58.9 0a8.88 8.88 0 0 0-4.55 1.2L43.65 25 62.7 48.2h24.6c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Paste a Google Drive sharing link. The file stays on Drive — nothing is uploaded to the server.
          </p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="input"
          >
            <option value="document">Document/PDF</option>
            <option value="video">Video</option>
            <option value="note">Study Notes</option>
            <option value="link">External Link</option>
          </select>
        </div>

        {/* File Upload or URL */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Content Source
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Upload File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept={formData.type === 'video' ? 'video/*' : formData.type === 'document' ? '.pdf,.doc,.docx,.ppt,.pptx' : '*'}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {formData.file ? formData.file.name : 'Click to upload file'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Max 100MB
                  </p>
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Or Enter URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input"
                placeholder="https://example.com/resource"
              />
              <p className="text-xs text-gray-500 mt-1">
                For external resources like YouTube videos, Google Drive files, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
            placeholder="Brief description of the material content"
          />
        </div>

        {/* Access Control */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Access Control</h4>
              <p className="text-sm text-gray-600">
                Choose who can access this material
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={!formData.isFree}
                  onChange={() => setFormData({ ...formData, isFree: false })}
                  className="mr-2"
                />
                <LockClosedIcon className="h-4 w-4 text-gray-500 mr-1" />
                <span className="text-sm">Enrolled Only</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={formData.isFree}
                  onChange={() => setFormData({ ...formData, isFree: true })}
                  className="mr-2"
                />
                <LockOpenIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm">Free Access</span>
              </label>
            </div>
          </div>

          <div className="mt-3 p-3 bg-white rounded border">
            <div className="flex items-center space-x-2">
              <PreviewIcon className="h-5 w-5 text-gray-500" />
              <span className="font-medium">{formData.title || 'Material Title'}</span>
              <p className="text-sm text-gray-600 mt-1 capitalize">{formData.type}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={uploading}
            className="btn btn-primary flex-1 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              'Upload Material'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={uploading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaterialUpload;
