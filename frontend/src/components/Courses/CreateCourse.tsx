import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import BackButton from '../Common/BackButton';
import { getAllCategories, saveCustomCategory } from '../../utils/categories';


interface CourseFormData {
  title: string;
  description: string;
  courseCode: string;
  credits: number;
  maxStudents: number;
  // fees removed
  // fees removed
  category: string;
  level: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
  prerequisites: string[];
  isFree: boolean;
}

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    courseCode: '',
    credits: 3,
    maxStudents: 30,
    // fees removed
    // fees removed
    category: '',
    level: '1st Year',
    prerequisites: [],
    isFree: false
  });



  // Category state — sourced from shared utility (base + localStorage custom)
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Handle checkbox separately if needed, but not used here for main form data currently

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up prerequisites
      const cleanedPrerequisites = formData.prerequisites.filter(p => p.trim() !== '');

      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('courseCode', formData.courseCode);
      data.append('credits', String(formData.credits));
      data.append('maxStudents', String(formData.maxStudents));
      data.append('category', formData.category);
      data.append('level', formData.level);
      data.append('isFree', String(formData.isFree));

      cleanedPrerequisites.forEach((p) => {
        data.append('prerequisites[]', p); // Use [] for array
      });

      if (selectedImage) {
        data.append('thumbnailImage', selectedImage);
      }

      const response = await axios.post('/api/courses', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Course created! Redirecting to add modules...');

      // Redirect to Add Module page with the new course ID
      navigate(`/courses/${response.data.course._id}/add-module`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
          <p className="mt-2 text-gray-600">
            Fill in the details below to create a new course
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

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
                placeholder="Introduction to Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Code *
              </label>
              <input
                type="text"
                name="courseCode"
                required
                value={formData.courseCode}
                onChange={handleChange}
                className="input"
                placeholder="CS101"
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
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${formData.category === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
                          }`}
                      >
                        Select Category
                      </button>
                      {categoryList.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setFormData(p => ({ ...p, category: cat })); setShowCategoryDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${formData.category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input type="hidden" name="category" value={formData.category} />

              {/* Create new category */}
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
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${formData.level === lvl ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                            }`}
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

            {/* Fees input removed */}

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isFree"
                  checked={formData.isFree}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-gray-900 font-medium">
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
              placeholder="Describe what students will learn in this course..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Thumbnail
            </label>

            {!previewUrl ? (
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary-500 transition-colors duration-200">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
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
                    src={previewUrl}
                    alt="Course Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setPreviewUrl(null);
                      }}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
                      title="Remove image"
                    >
                      <TrashIcon className="h-6 w-6 text-red-600" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setPreviewUrl(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prerequisites */}
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

        {/* Submit Button */}
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
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create & Add Modules'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;
