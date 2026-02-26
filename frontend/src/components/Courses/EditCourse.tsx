import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../Common/LoadingSpinner';
import type { Course, CourseMaterial, Module } from '../../types';

import BackButton from '../Common/BackButton';
import { getAllCategories, saveCustomCategory } from '../../utils/categories';

interface CourseFormData {
  title: string;
  description: string;
  courseCode: string;
  credits: number;
  maxStudents: number;
  category: string;
  level: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
  prerequisites: string[];
  isActive: boolean;
  isFree: boolean;
  thumbnailImage: string;
  materials: CourseMaterial[];
  modules: Module[];
}

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    courseCode: '',
    credits: 3,
    maxStudents: 30,
    // fees removed
    category: '',
    level: '1st Year',
    prerequisites: [''],
    isActive: true,
    isFree: false,
    thumbnailImage: '',
    materials: [],
    modules: []
  });



  const [categoryList, setCategoryList] = useState(() => getAllCategories().map(c => c.label));
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const levelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(e.target as Node)) {
        setShowLevelDropdown(false);
      }
    };
    if (showCategoryDropdown || showLevelDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCategoryDropdown, showLevelDropdown]);

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categoryList.includes(trimmed)) {
      toast.error('Category already exists');
      return;
    }
    saveCustomCategory(trimmed);
    const updated = getAllCategories().map(c => c.label);
    setCategoryList(updated);
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryInput('');
    setShowNewCategory(false);
    toast.success(`Category "${trimmed}" created!`);
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get<Course>(`/api/courses/${id}`);
      const course = response.data;

      setFormData({
        title: course.title,
        description: course.description,
        courseCode: course.courseCode,
        credits: course.credits,
        maxStudents: course.maxStudents,
        // fees removed
        category: course.category || '',
        level: course.level,
        prerequisites: course.prerequisites && course.prerequisites.length > 0 ? course.prerequisites : [''],
        isActive: true,
        thumbnailImage: course.thumbnailImage || '',
        isFree: course.isFree || false,
        materials: course.materials || [],
        modules: course.modules || []
      });
      // Handle isActive explicitly if it's in the response but not strictly typed in frontend yet
      if ('isActive' in course) {
        setFormData(prev => ({ ...prev, isActive: (course as any).isActive }));
      }
      if ('isFree' in course) {
        setFormData(prev => ({ ...prev, isFree: (course as any).isFree }));
      }

    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handlePrerequisiteChange = (index: number, value: string) => {
    const newPrerequisites = [...formData.prerequisites];
    newPrerequisites[index] = value;
    setFormData(prev => ({ ...prev, prerequisites: newPrerequisites }));
  };

  const addPrerequisite = () => {
    setFormData(prev => ({
      ...prev,
      prerequisites: [...prev.prerequisites, '']
    }));
  };

  const removePrerequisite = (index: number) => {
    const newPrerequisites = formData.prerequisites.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, prerequisites: newPrerequisites }));
  };



  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 5MB for images)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', 'course-material'); // Reusing existing type or could be 'image' if backend supported

        const response = await axios.post('/api/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const fileUrl = response.data.url || response.data.filePath;
        setFormData(prev => ({ ...prev, thumbnailImage: fileUrl }));
        toast.success('Thumbnail uploaded successfully');
      } catch (error: any) {
        console.error('Thumbnail upload error:', error);
        toast.error(error.response?.data?.message || 'Failed to upload thumbnail');
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;

    try {
      await axios.delete(`/api/courses/${id}/modules/${moduleId}`);
      toast.success('Module deleted');
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.filter(m => m._id !== moduleId)
      }));
    } catch (error) {
      console.error('Delete module error:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanedData = {
        ...formData,
        ...formData,
        prerequisites: formData.prerequisites.filter(p => p.trim() !== ''),
        materials: formData.materials.map(material => ({
          title: material.title,
          type: material.type,
          url: material.url,
          filename: material.filename || '',
          description: material.description || ''
        })),
        thumbnailImage: formData.thumbnailImage
      };

      await axios.put(`/api/courses/${id}`, cleanedData);
      toast.success('Course updated successfully');
      navigate('/courses');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
          <p className="mt-1 text-gray-600">Update course details and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Thumbnail */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Thumbnail</h2>
          <div className="mt-2">
            {!formData.thumbnailImage ? (
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary-500 transition-colors duration-200">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="thumbnail-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="thumbnail-upload"
                        name="thumbnail-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="relative h-48 w-full md:w-96 rounded-lg overflow-hidden border border-gray-200 group">
                  <img
                    src={formData.thumbnailImage}
                    alt="Course Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, thumbnailImage: '' }))}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
                      title="Remove image"
                    >
                      <TrashIcon className="h-6 w-6 text-red-600" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, thumbnailImage: '' }))}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Code (Read Only)
              </label>
              <input
                type="text"
                value={formData.courseCode}
                disabled
                className="input bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div ref={categoryDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown(o => !o)}
                  className="input w-full flex items-center justify-between text-left gap-2"
                >
                  <span className={formData.category ? 'text-gray-900' : 'text-gray-400'}>
                    {formData.category || 'Select Category'}
                  </span>
                  <svg
                    className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCategoryDropdown && (
                  <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
                      <button
                        type="button"
                        onClick={() => { setFormData(p => ({ ...p, category: '' })); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${formData.category === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'}`}
                      >
                        Select Category
                      </button>
                      {categoryList.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setFormData(p => ({ ...p, category: cat })); setShowCategoryDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${formData.category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input type="hidden" name="category" value={formData.category} />

              {!showNewCategory ? (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <TagIcon className="h-3.5 w-3.5" />
                  Create new category
                </button>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newCategoryInput}
                    onChange={e => setNewCategoryInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } if (e.key === 'Escape') setShowNewCategory(false); }}
                    className="input flex-1 text-sm py-1.5"
                    placeholder="e.g. Robotics"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="btn btn-primary btn-sm px-3 py-1.5 text-xs"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewCategory(false); setNewCategoryInput(''); }}
                    className="btn btn-secondary btn-sm px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level *
              </label>
              <div ref={levelDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowLevelDropdown(o => !o)}
                  className="input w-full flex items-center justify-between text-left gap-2"
                >
                  <span className={formData.level ? 'text-gray-900' : 'text-gray-400'}>
                    {formData.level || 'Select Level'}
                  </span>
                  <svg
                    className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${showLevelDropdown ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLevelDropdown && (
                  <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({ ...p, level: lvl as any }));
                            setShowLevelDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${formData.level === lvl ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input type="hidden" name="level" value={formData.level} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credits *
              </label>
              <input
                type="number"
                name="credits"
                required
                min="1"
                max="10"
                value={formData.credits}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Students *
              </label>
              <input
                type="number"
                name="maxStudents"
                required
                min="1"
                value={formData.maxStudents}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-gray-700 font-medium">
                  Course is Visible to Students
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-8">
                Uncheck this to hide the course from the public course list.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFree}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-gray-700 font-medium">
                  Free Access Course
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-8">
                Check this box to make this course and its modules accessible to unauthenticated users.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="input"
            />
          </div>
        </div>

        {/* Course Modules */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Course Modules</h2>
            <button
              type="button"
              onClick={() => navigate(`/courses/${id}/add-module`)}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Module
            </button>
          </div>

          <div className="space-y-4">
            {formData.modules.map((module, index) => (
              <div key={module._id || index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{module.title}</h3>
                  <p className="text-sm text-gray-500">{module.description}</p>
                  <span className="text-xs text-gray-400">{module.materials?.length || 0} materials</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/courses/${id}/modules/${module._id}/edit`)}
                    className="btn btn-secondary btn-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => module._id && handleDeleteModule(module._id)}
                    className="btn btn-danger btn-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {formData.modules.length === 0 && (
              <p className="text-gray-500 text-center py-4">No modules added yet.</p>
            )}
          </div>
        </div>

        {/* Prerequisites - Simplified for Edit */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Prerequisites</h2>
            <button
              type="button"
              onClick={addPrerequisite}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {formData.prerequisites.map((prereq, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={prereq}
                  onChange={(e) => handlePrerequisiteChange(index, e.target.value)}
                  className="input flex-1"
                  placeholder="Enter prerequisite"
                />
                <button
                  type="button"
                  onClick={() => removePrerequisite(index)}
                  className="btn btn-danger btn-sm"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Course Materials */}


        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCourse;
