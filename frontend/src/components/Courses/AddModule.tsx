import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { MarkdownManager } from '../Markdown';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentIcon,
  LinkIcon,
  VideoCameraIcon,
  ClockIcon,
  BookOpenIcon,
  Bars4Icon,
  EyeIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { CourseMaterial, Module, Assignment } from '../../types';
import AssignmentForm from '../Assignments/AssignmentForm';

// Convert Google Drive sharing links to a direct preview/view link
const normalizeGDriveLink = (link: string): string => {
  const fileMatch = link.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }
  const openMatch = link.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }
  return link;
};

interface DraggableModuleProps {
  mod: Module;
  index: number;
  id: string; // Course ID
  moveModule: (dragIndex: number, hoverIndex: number) => void;
  navigate: any;
  handleRemoveModule: (id: string) => void;
  handleEditModule: (mod: Module) => void;
}

const DraggableModule = ({ mod, index, id, moveModule, navigate, handleRemoveModule, handleEditModule }: DraggableModuleProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'module',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveModule(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'module',
    item: () => {
      return { id: mod._id, index };
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId} className="border border-gray-200 rounded-lg bg-white shadow-sm transition-all hover:shadow-md">
      <div
        className="px-5 py-4 cursor-pointer flex items-start gap-4"
      >
        {/* Drag Handle */}
        <div className="mt-1 cursor-move text-gray-400 hover:text-gray-600">
          <Bars4Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 cursor-grab active:cursor-grabbing">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2 gap-x-4 mb-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                Module {index + 1}
              </span>
              <h3 className="text-base font-semibold text-gray-900 break-words">{mod.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 sm:mt-0">
              <span className="flex items-center text-sm text-gray-500 whitespace-nowrap">
                <ClockIcon className="w-3 h-3 mr-1" />
                {mod.duration || 'No duration'}
              </span>
              {mod.assignments && mod.assignments.length > 0 && (
                <span className="flex items-center text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 whitespace-nowrap">
                  <DocumentIcon className="w-3 h-3 mr-1" />
                  {mod.assignments.length} Assignments
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{mod.description}</p>

          <div className="flex items-center text-sm text-gray-500">
            <BookOpenIcon className="w-4 h-4 mr-1" />
            {mod.materials?.length || 0} materials
          </div>
        </div>

        <div className="ml-4 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (mod._id) navigate(`/courses/${id}/modules/${mod._id}`);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="View Module"
          >
            <EyeIcon className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditModule(mod);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="Edit Module"
          >
            <PencilIcon className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              mod._id && handleRemoveModule(mod._id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            title="Delete Module"
          >
            <TrashIcon className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
};

const AddModule = () => {
  const { id, moduleId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  void fileInputRef; // unused after removing file upload
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [showReorderConfirm, setShowReorderConfirm] = useState(false);
  const [originalModulesList, setOriginalModulesList] = useState<Module[]>([]);

  // Module Basic Info
  const [moduleData, setModuleData] = useState({
    title: '',
    description: '',
    duration: '',
    assignments: [] as string[],
    isAssignmentBlocking: true, // Default to true
  });

  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  // GDrive material input
  const [gdriveTempTitle, setGdriveTempTitle] = useState('');
  const [gdriveTempLink, setGdriveTempLink] = useState('');

  // Expanded assignments in the editor list
  const [expandedAssignments, setExpandedAssignments] = useState<string[]>([]);
  const toggleExpandAssignment = (id: string) => {
    setExpandedAssignments(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [showAssignmentDropdown, setShowAssignmentDropdown] = useState(false);
  const assignmentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assignmentDropdownRef.current && !assignmentDropdownRef.current.contains(e.target as Node)) {
        setShowAssignmentDropdown(false);
      }
    };
    if (showAssignmentDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAssignmentDropdown]);

  // Markdown Content
  const [markdownContent, setMarkdownContent] = useState('');

  // Materials List (Pending Uploads)
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [modulesList, setModulesList] = useState<Module[]>([]);

  const fetchCourseData = async () => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/courses/${id}`);
      const course = res.data;
      setModulesList(course.modules || []);
      setOriginalModulesList(course.modules || []);

      // Fetch all available assignments (not just this course)
      try {
        const assignRes = await axios.get(`/api/assignments`);
        setAvailableAssignments(assignRes.data);
      } catch (err) {
        console.error("Failed to load assignments", err);
      }

      if (moduleId && !editingModuleId) {
        // Initial deep link load if provided
        const module = course.modules.find((m: any) => m._id === moduleId);
        if (module) {
          setEditingModuleId(moduleId);
          setModuleData({
            title: module.title,
            description: module.description || '',
            duration: module.duration || '',
            assignments: module.assignments?.map((a: any) => typeof a === 'object' ? a._id : a) || [],
            isAssignmentBlocking: module.isAssignmentBlocking !== undefined ? module.isAssignmentBlocking : true,
          });
          setMarkdownContent(module.markdownContent || '');
          setMaterials(module.materials || []);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id, moduleId, navigate]);




  const addMaterialToList = () => {
    if (!gdriveTempTitle.trim()) {
      toast.error('Please provide a title for the material');
      return;
    }
    if (!gdriveTempLink.trim()) {
      toast.error('Please provide a Google Drive link');
      return;
    }
    try {
      new URL(gdriveTempLink);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const newMaterial: CourseMaterial = {
      title: gdriveTempTitle.trim(),
      type: 'document',
      url: normalizeGDriveLink(gdriveTempLink.trim()),
      filename: '',
      description: ''
    };

    setMaterials([...materials, newMaterial]);
    setGdriveTempTitle('');
    setGdriveTempLink('');
    toast.success('Material added');
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleRemoveModule = async (modId: string) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await axios.delete(`/api/courses/${id}/modules/${modId}`);
      toast.success('Module deleted');
      fetchCourseData(); // Refresh list
      if (moduleId === modId) {
        navigate(`/courses/${id}/add-module`); // Go back to add mode if we deleted current module
        // Reset form
        setModuleData({
          title: '',
          description: '',
          duration: '',
          assignments: [],
          isAssignmentBlocking: true,
        });
        setMarkdownContent('');
        setMaterials([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete module');
    }
  };

  const handleEditModule = (mod: Module) => {
    if (!mod._id) return;
    setEditingModuleId(mod._id);
    setModuleData({
      title: mod.title,
      description: mod.description || '',
      duration: mod.duration || '',
      assignments: (mod.assignments || []).map((a: any) => typeof a === 'object' ? a._id : a),
      isAssignmentBlocking: mod.isAssignmentBlocking !== undefined ? mod.isAssignmentBlocking : true,
    });
    setMarkdownContent(mod.markdownContent || '');
    setMaterials(mod.materials || []);
    // expand the one we are editing - functionality removed


    // Scroll to form
    setTimeout(() => {
      document.getElementById('module-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingModuleId(null);
    setEditingModuleId(null);
    setModuleData({ title: '', description: '', duration: '', assignments: [], isAssignmentBlocking: true });
    setMarkdownContent('');
    setMaterials([]);
    setGdriveTempTitle('');
    setGdriveTempLink('');
  };

  const handleSaveModule = async () => {
    if (!moduleData.title) {
      toast.error('Module Title is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...moduleData,
        markdownContent,
        materials
      };

      if (editingModuleId) {
        // Update existing module
        await axios.put(`/api/courses/${id}/modules/${editingModuleId}`, payload);
        toast.success('Module updated successfully');
        await fetchCourseData(); // Refresh list

        // Reset to add mode after update
        handleCancelEdit();
      } else {
        // Create new module
        await axios.post(`/api/courses/${id}/modules`, payload);
        toast.success('Module saved! You can add another one.');
        await fetchCourseData(); // Refresh list

        // Reset form for next module
        handleCancelEdit();
        setMarkdownContent('');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save module');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitModules = async () => {
    // Warn if user left the assignment creation form open (unsaved draft assignment)
    if (isCreatingAssignment) {
      setIsCreatingAssignment(false);
      toast('Assignment creation form was closed — the draft assignment was not saved.', { icon: '⚠️' });
    }

    // Auto-save any unsaved module form data before leaving
    const hasUnsavedContent = moduleData.title.trim() ||
      moduleData.description.trim() ||
      markdownContent.trim() ||
      materials.length > 0 ||
      moduleData.assignments.length > 0;

    if (hasUnsavedContent) {
      if (!moduleData.title.trim()) {
        toast.error('Please add a Module Title before finishing, or clear the form.');
        document.getElementById('module-form-section')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      // Auto-save the module
      toast.loading('Auto-saving unsaved module...', { id: 'autosave' });
      setLoading(true);
      try {
        const payload = {
          ...moduleData,
          markdownContent,
          materials
        };
        if (editingModuleId) {
          await axios.put(`/api/courses/${id}/modules/${editingModuleId}`, payload);
          toast.success(`Module "${moduleData.title}" updated automatically!`, { id: 'autosave' });
        } else {
          await axios.post(`/api/courses/${id}/modules`, payload);
          toast.success(`Module "${moduleData.title}" saved automatically!`, { id: 'autosave' });
        }
      } catch (error) {
        console.error(error);
        toast.error('Auto-save failed — please save the module manually.', { id: 'autosave' });
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    navigate(`/courses/${id}`);
  };



  const moveModule = (dragIndex: number, hoverIndex: number) => {
    const dragModule = modulesList[dragIndex];
    if (!dragModule) return;

    // Create new array
    const newModules = [...modulesList];
    // Remove dragged item
    newModules.splice(dragIndex, 1);
    // Insert at new position
    newModules.splice(hoverIndex, 0, dragModule);

    setModulesList(newModules);
    setShowReorderConfirm(true);
  };

  const cancelReorder = () => {
    setModulesList(originalModulesList);
    setShowReorderConfirm(false);
    toast('Reorder cancelled', { icon: '↩️' });
  };

  const saveReorder = async () => {
    try {
      // Assuming existing PUT /modules or PUT course updates full object
      // We will use PUT /api/courses/{id} and send the new modules list
      // We need to fetch current course data first to not overwrite other fields?
      // Or we can just send { modules: modulesList } as partial update if API supports it.
      // Looking at courses.js, it supports partial updates via $set: updates.

      await axios.put(`/api/courses/${id}`, {
        modules: modulesList
      });

      setOriginalModulesList(modulesList);
      setShowReorderConfirm(false);
      toast.success('Module order updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
      setModulesList(originalModulesList); // revert
    }
  };

  return (

    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 sm:mr-4 text-gray-500 hover:text-gray-700 transition-colors mt-1 sm:mt-0 flex-shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editingModuleId ? 'Edit Module' : 'Add New Module'}</h1>
            <p className="text-sm text-gray-500 mt-1">{editingModuleId ? `Editing: ${moduleData.title}` : 'Manage your course content and structure'}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Module Form */}
      <div id="module-form-section" className="space-y-6 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {moduleId ? `Editing: ${moduleData.title || 'Untitled Module'}` : 'Add New Module'}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
                <input
                  type="text"
                  className="input w-full"
                  value={moduleData.title}
                  onChange={(e) => setModuleData({ ...moduleData, title: e.target.value })}
                  placeholder="e.g. Introduction to React" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                  type="text"
                  className="input w-full"
                  value={moduleData.duration}
                  onChange={(e) => setModuleData({ ...moduleData, duration: e.target.value })}
                  placeholder="e.g. 2 hours" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={moduleData.description}
                  onChange={(e) => setModuleData({ ...moduleData, description: e.target.value })}
                  placeholder="Brief overview of what students will learn..." />
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* Materials Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Materials</h3>

              {/* Add Material via GDrive */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Add Material via Google Drive</h4>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors"
                      placeholder="e.g. Week 1 Lecture Slides"
                      value={gdriveTempTitle}
                      onChange={(e) => setGdriveTempTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Google Drive Link <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="url"
                        className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors pl-10"
                        placeholder="https://drive.google.com/file/d/.../view"
                        value={gdriveTempLink}
                        onChange={(e) => setGdriveTempLink(e.target.value)}
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L29 52.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                        <path d="M43.65 25l-15.25-26.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 43.7A8.9 8.9 0 0 0 0 48.2h29z" fill="#00ac47" />
                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L84.7 60l-22-38h-29l14.65 25.35z" fill="#ea4335" />
                        <path d="M43.65 25L58.9 0H29a8.88 8.88 0 0 0-4.55 1.2l14.65 25.35 4.55-1.55z" fill="#00832d" />
                        <path d="M58.3 52.2H29l-15.25 26.4c1.35.8 2.9 1.2 4.55 1.2H69c1.65 0 3.2-.4 4.55-1.2z" fill="#2684fc" />
                        <path d="M73.4 26.5L58.9 0a8.88 8.88 0 0 0-4.55 1.2L43.65 25 62.7 48.2h24.6c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Paste a Drive sharing link — file stays on Drive, nothing uploaded.</p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={addMaterialToList}
                      className="btn btn-primary px-6 py-2.5 flex items-center shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Material
                    </button>
                  </div>
                </div>
              </div>

              {/* Materials List */}
              {materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {m.type === 'video' ? (
                            <VideoCameraIcon className="h-5 w-5 text-blue-500" />
                          ) : m.type === 'link' ? (
                            <LinkIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <DocumentIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{m.type} • {m.filename || 'URL'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {m.url && (
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                            title="View document"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => removeMaterial(idx)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">No materials added to this module yet.</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* Content Editor */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Content (Markdown)</h3>
              <div className="w-full h-full">
                <MarkdownManager
                  initialValue={markdownContent}
                  onChange={(val) => setMarkdownContent(val)}
                  height="h-[600px]"
                  key={editingModuleId || 'new-module'} // Force re-render when switching contexts
                />
              </div>

              <div className="border-t border-gray-100 my-6"></div>

              {/* Assignment Section (Moved Bottom) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Module Assignments</h3>
                  {!isCreatingAssignment && (
                    <button
                      onClick={() => setIsCreatingAssignment(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Create New Assignment
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                  {/* List of Added Assignments */}
                  {moduleData.assignments && moduleData.assignments.length > 0 && (
                    <div className="border-b border-gray-200 bg-white">
                      {moduleData.assignments.map((assignId, index) => {
                        const assignParams = availableAssignments.find(a => a._id === assignId);
                        const isExpanded = expandedAssignments.includes(assignId);
                        return (
                          <div key={index} className="border-b last:border-0 border-gray-100">
                            {/* Header row */}
                            <div className="px-6 py-4 flex justify-between items-center hover:bg-gray-50">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                  <DocumentIcon className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">{assignParams?.title || 'Unknown Assignment'}</h4>
                                  <p className="text-xs text-gray-500">
                                    Created: {(assignParams as any)?.createdAt ? new Date((assignParams as any).createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Expand toggle */}
                                <button
                                  onClick={() => toggleExpandAssignment(assignId)}
                                  className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded"
                                  title={isExpanded ? 'Collapse' : 'View details'}
                                >
                                  {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                </button>
                                {/* Remove */}
                                <button
                                  onClick={() => {
                                    const newAssignments = [...moduleData.assignments];
                                    newAssignments.splice(index, 1);
                                    setModuleData({ ...moduleData, assignments: newAssignments });
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                  title="Remove Assignment"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && assignParams && (
                              <div className="px-6 pb-5 bg-indigo-50/40 border-t border-indigo-100">
                                {/* Description */}
                                {assignParams.description && (
                                  <div className="mt-3 mb-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignParams.description}</p>
                                  </div>
                                )}

                                {/* Assignment attachments */}
                                {assignParams.attachments && (assignParams.attachments as any[]).length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assignment Materials</p>
                                    <div className="space-y-1">
                                      {(assignParams.attachments as any[]).map((att: any, i: number) => {
                                        const href = att.url || att.path || '#';
                                        const fullUrl = href.startsWith('http') ? href : `http://localhost:5000${href}`;
                                        return (
                                          <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded border border-blue-100 hover:bg-blue-50 transition-colors">
                                            <LinkIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                            <span className="text-blue-700 font-medium truncate">{att.originalName || 'View Attachment'}</span>
                                            <EyeIcon className="w-3 h-3 text-blue-400 flex-shrink-0 ml-auto" />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Solution */}
                                {assignParams.solution && (assignParams.solution as any[]).length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Solution Key</p>
                                    <div className="space-y-1">
                                      {(assignParams.solution as any[]).map((sol: any, i: number) => {
                                        const href = sol.url || sol.path || '#';
                                        const fullUrl = href.startsWith('http') ? href : `http://localhost:5000${href}`;
                                        return (
                                          <a key={i} href={fullUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded border border-green-100 hover:bg-green-50 transition-colors">
                                            <LinkIcon className="w-3 h-3 text-green-600 flex-shrink-0" />
                                            <span className="text-green-700 font-medium truncate">{sol.originalName || 'View Solution'}</span>
                                            <EyeIcon className="w-3 h-3 text-green-500 flex-shrink-0 ml-auto" />
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* No details case */}
                                {!assignParams.description && !(assignParams.attachments as any[])?.length && !(assignParams.solution as any[])?.length && (
                                  <p className="text-xs text-gray-400 mt-3 italic">No description, materials or solution added yet. Edit the assignment to add them.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New / Select Existing Area */}
                  {isCreatingAssignment ? (
                    <div className="p-6 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Create New Assignment</h4>
                        <button onClick={() => setIsCreatingAssignment(false)} className="text-gray-400 hover:text-gray-600">
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <AssignmentForm
                        embedded={true}
                        initialCourseId={id}
                        onSuccess={(newAssignment) => {
                          // Append to list if not already there
                          if (!moduleData.assignments.includes(newAssignment._id)) {
                            setModuleData(prev => ({ ...prev, assignments: [...prev.assignments, newAssignment._id] }));
                          }
                          setIsCreatingAssignment(false);
                          setAvailableAssignments(prev => {
                            if (prev.find(p => p._id === newAssignment._id)) return prev;
                            return [...prev, newAssignment];
                          });
                          toast.success("Assignment created and linked!");
                        }}
                        onCancel={() => setIsCreatingAssignment(false)}
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50">
                      <div className="max-w-md mx-auto relative" ref={assignmentDropdownRef}>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Link Existing Assignment</label>
                        <button
                          type="button"
                          onClick={() => setShowAssignmentDropdown(o => !o)}
                          className="input w-full mb-3 flex items-center justify-between text-left gap-2"
                        >
                          <span className="text-gray-400">
                            -- Select Assignment to Link --
                          </span>
                          <ChevronDownIcon
                            className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${showAssignmentDropdown ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {showAssignmentDropdown && (
                          <div className="absolute z-40 top-[60px] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                            <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
                              {availableAssignments.filter(a => !moduleData.assignments.includes(a._id)).length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">No more assignments to link</div>
                              ) : (
                                availableAssignments.filter(a => !moduleData.assignments.includes(a._id)).map((assign) => (
                                  <button
                                    key={assign._id}
                                    type="button"
                                    onClick={() => {
                                      setModuleData(prev => ({ ...prev, assignments: [...prev.assignments, assign._id] }));
                                      setShowAssignmentDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors text-gray-900 border-b border-gray-50 last:border-0"
                                  >
                                    <div className="font-medium truncate">{assign.title}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">Created: {(assign as any).createdAt ? new Date((assign as any).createdAt).toLocaleDateString('en-GB') : 'N/A'}</div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100">

              {editingModuleId && (
                <button
                  onClick={handleCancelEdit}
                  className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                >
                  Cancel Edit
                </button>
              )}
              <button
                onClick={handleSaveModule}
                disabled={loading}
                className="btn btn-primary w-full sm:w-auto sm:min-w-[150px]"
              >
                {loading ? 'Saving...' : (editingModuleId ? 'Update Module' : 'Save & Add Module')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-100 py-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wide">Manage Structure</h3>
      </div>

      {/* Existing Modules Accordion List */}
      <DndProvider backend={HTML5Backend}>
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Course Modules</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{modulesList.length} modules</span>
              {showReorderConfirm && (
                <div className="flex items-center gap-2 animate-pulse bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <span className="text-xs text-blue-700 font-medium">Order changed</span>
                  <button onClick={saveReorder} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">Save</button>
                  <button onClick={cancelReorder} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              )}
            </div>
          </div>

          {modulesList.length > 0 ? (
            <div className="space-y-4">
              {modulesList.map((mod, index) => (
                <DraggableModule
                  key={mod._id || index}
                  mod={mod}
                  index={index}
                  id={id || ''}
                  moveModule={moveModule}
                  navigate={navigate}
                  handleRemoveModule={handleRemoveModule}
                  handleEditModule={handleEditModule} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">No modules added yet.</p>
              <p className="text-sm text-gray-400">Add your first module below.</p>
            </div>
          )}
        </div>
      </DndProvider>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          onClick={handleSubmitModules}
          className="btn btn-primary min-w-[150px] shadow-sm hover:shadow-md transition-all"
        >
          Finish & View Course
        </button>
      </div>
    </div >
  );
};
export default AddModule;
