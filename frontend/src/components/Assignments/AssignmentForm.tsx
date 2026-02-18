import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { PlusIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Course, RubricItem, Assignment } from '../../types';

interface AssignmentFormProps {
    initialCourseId?: string;
    assignmentId?: string; // New prop for editing
    onSuccess?: (assignment: Assignment) => void;
    onCancel?: () => void;
    embedded?: boolean;
}

const AssignmentForm = ({ initialCourseId, assignmentId, onSuccess, onCancel, embedded = false }: AssignmentFormProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [materialsGdriveLink, setMaterialsGdriveLink] = useState('');
    const [solutionGdriveLink, setSolutionGdriveLink] = useState('');

    interface FormData {
        title: string;
        description: string;
        courseId: string;
        type: string;
        totalPoints: number;
        dueDate: string;
        submissionType: string;
        allowedFileTypes: string[];
        maxFileSize: number;
        instructions: string;
        isPublished: boolean;
        allowLateSubmission: boolean;
        latePenalty: number;
        rubric: RubricItem[];
        attachments: { originalName: string; path: string; mimetype: string; type?: string; url?: string }[];
        solution: { originalName: string; path: string; mimetype: string; type?: string; url?: string }[];
        isSolutionVisible: boolean;
        hasNoDueDate?: boolean; // New field
    }

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        courseId: initialCourseId || '',
        type: 'homework',
        totalPoints: 100,
        dueDate: '',
        hasNoDueDate: false, // New field
        submissionType: 'both',
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        maxFileSize: 10485760, // 10MB
        instructions: '',
        isPublished: true,
        allowLateSubmission: true,
        latePenalty: 10,
        rubric: [],
        attachments: [],
        solution: [],
        isSolutionVisible: true
    });

    useEffect(() => {
        if (user && !initialCourseId) {
            fetchInstructorCourses();
        }
        if (assignmentId) {
            fetchAssignmentDetails();
        }
    }, [user, initialCourseId, assignmentId]);

    const fetchInstructorCourses = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`/api/courses/instructor/${user._id}`);
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchAssignmentDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/assignments/${assignmentId}`);
            const assignment = response.data;

            // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
            const formattedDate = assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '';

            setFormData({
                title: assignment.title,
                description: assignment.description,
                courseId: assignment.course._id || assignment.course, // Handle populated or ID
                type: assignment.type,
                totalPoints: assignment.totalPoints,
                dueDate: formattedDate,
                hasNoDueDate: !assignment.dueDate,
                submissionType: assignment.submissionType,
                allowedFileTypes: assignment.allowedFileTypes || [],
                maxFileSize: assignment.maxFileSize,
                instructions: assignment.instructions || '',
                isPublished: assignment.isPublished,
                allowLateSubmission: assignment.allowLateSubmission,
                latePenalty: assignment.latePenalty || 0,
                rubric: assignment.rubric || [],
                attachments: assignment.attachments || [],
                solution: assignment.solution || [],
                isSolutionVisible: assignment.isSolutionVisible
            });
        } catch (error) {
            console.error('Error fetching assignment details:', error);
            toast.error('Failed to load assignment details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'dueDate') {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else if (name === 'hasNoDueDate') { // Handle checkbox
            setFormData(prev => ({
                ...prev,
                hasNoDueDate: checked,
                dueDate: checked ? '' : prev.dueDate // Clear date if checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked :
                    type === 'number' ? parseInt(value) || 0 : value
            }));
        }
    };

    const handleFileTypeChange = (fileType: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            allowedFileTypes: checked
                ? [...prev.allowedFileTypes, fileType]
                : prev.allowedFileTypes.filter(type => type !== fileType)
        }));
    };

    const uploadFile = async (file: File, context: 'assignment-admin' | 'assignment-student') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'document');
        formData.append('context', context);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            return {
                originalName: response.data.originalName,
                filename: response.data.filename,
                path: response.data.filePath,
                mimetype: response.data.mimetype
            };
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(`Failed to upload ${file.name}`);
            throw error;
        }
    };

    const handleAssignmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        setLoading(true);
        try {
            const uploadedAttachments = await Promise.all(
                files.map(file => uploadFile(file, 'assignment-admin'))
            );

            setFormData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), ...uploadedAttachments]
            }));
            toast.success('Files uploaded successfully');
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleSolutionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);

        setLoading(true);
        try {
            const uploadedSolutions = await Promise.all(
                files.map(file => uploadFile(file, 'assignment-admin'))
            );
            setFormData(prev => ({
                ...prev,
                solution: [...(prev.solution || []), ...uploadedSolutions]
            }));
            toast.success(`${files.length} solution file(s) uploaded successfully`);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const removeAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const removeSolution = (index: number) => {
        setFormData(prev => ({
            ...prev,
            solution: prev.solution.filter((_, i) => i !== index)
        }));
    };

    const addMaterialsGdriveLink = () => {
        if (!materialsGdriveLink.trim()) {
            toast.error('Please enter a Google Drive link');
            return;
        }
        try {
            new URL(materialsGdriveLink);
        } catch {
            toast.error('Please enter a valid URL');
            return;
        }
        setFormData(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), {
                originalName: 'Google Drive Link',
                path: materialsGdriveLink,
                url: materialsGdriveLink,
                mimetype: 'application/x-google-drive-link',
                type: 'link'
            }]
        }));
        setMaterialsGdriveLink('');
        toast.success('Google Drive link added');
    };

    const addSolutionGdriveLink = () => {
        if (!solutionGdriveLink.trim()) {
            toast.error('Please enter a Google Drive link');
            return;
        }
        try {
            new URL(solutionGdriveLink);
        } catch {
            toast.error('Please enter a valid URL');
            return;
        }
        setFormData(prev => ({
            ...prev,
            solution: [...(prev.solution || []), {
                originalName: 'Google Drive Link',
                path: solutionGdriveLink,
                url: solutionGdriveLink,
                mimetype: 'application/x-google-drive-link',
                type: 'link'
            }]
        }));
        setSolutionGdriveLink('');
        toast.success('Solution Google Drive link added');
    };

    const addRubricCriteria = () => {
        setFormData(prev => ({
            ...prev,
            rubric: [...prev.rubric, { criteria: '', points: 0, description: '' }]
        }));
    };

    const removeRubricCriteria = (index: number) => {
        setFormData(prev => ({
            ...prev,
            rubric: prev.rubric.filter((_, i) => i !== index)
        }));
    };

    const updateRubricCriteria = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            rubric: prev.rubric.map((item, i) =>
                i === index ? { ...item, [field]: field === 'points' ? parseInt(value) || 0 : value } : item
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.hasNoDueDate) {
            if (!formData.dueDate) {
                toast.error('Please select a due date');
                setLoading(false);
                return;
            }

            const dueDate = new Date(formData.dueDate);
            if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
                toast.error('Please select a valid future date for the due date');
                setLoading(false);
                return;
            }
        }

        try {
            const payload = {
                ...formData,
                dueDate: formData.hasNoDueDate ? null : new Date(formData.dueDate).toISOString(),
                allowedFileTypes: formData.allowedFileTypes,
                rubric: formData.rubric,
                attachments: formData.attachments,
                solution: formData.solution,
                isSolutionVisible: formData.isSolutionVisible
            };

            let response;
            if (assignmentId) {
                response = await axios.put(`/api/assignments/${assignmentId}`, payload, {
                    headers: { 'Content-Type': 'application/json' }
                });
                toast.success('Assignment updated successfully!');
            } else {
                response = await axios.post('/api/assignments', payload, {
                    headers: { 'Content-Type': 'application/json' }
                });
                toast.success('Assignment created successfully!');
            }

            if (onSuccess) {
                onSuccess(response.data.assignment);
            } else {
                navigate(`/assignments/${response.data.assignment._id}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    const fileTypes = [
        { value: 'pdf', label: 'PDF' },
        { value: 'doc', label: 'DOC' },
        { value: 'docx', label: 'DOCX' },
        { value: 'txt', label: 'TXT' },
        { value: 'jpg', label: 'JPG' },
        { value: 'png', label: 'PNG' },
        { value: 'zip', label: 'ZIP' }
    ];

    const getMinDateTime = () => {
        const minTime = new Date();
        minTime.setHours(minTime.getHours() + 1);
        return minTime.toISOString().slice(0, 16);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0' : ''}`}>
                {!embedded && <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title *</label>
                        <input type="text" name="title" required value={formData.title} onChange={handleChange} className="input" placeholder="Assignment 1: Data Structures" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                        {initialCourseId ? (
                            <input type="text" disabled value="Current Course" className="input bg-gray-100 text-gray-500 cursor-not-allowed" />
                        ) : (
                            <select name="courseId" required value={formData.courseId} onChange={handleChange} className="input">
                                <option value="">Select Course</option>
                                {courses.map(course => <option key={course._id} value={course._id}>{course.title} ({course.courseCode})</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type *</label>
                        <select name="type" required value={formData.type} onChange={handleChange} className="input">
                            <option value="homework">Homework</option>
                            <option value="quiz">Quiz</option>
                            <option value="exam">Exam</option>
                            <option value="project">Project</option>
                            <option value="presentation">Presentation</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Points *</label>
                        <input type="number" name="totalPoints" required min="1" value={formData.totalPoints} onChange={handleChange} className="input" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="datetime-local"
                                name="dueDate"
                                required={!formData.hasNoDueDate}
                                min={getMinDateTime()}
                                value={formData.dueDate}
                                onChange={handleChange}
                                disabled={formData.hasNoDueDate}
                                className={`input flex-1 ${formData.hasNoDueDate ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <label className="flex items-center min-w-[80px]">
                                <input
                                    type="checkbox"
                                    name="hasNoDueDate"
                                    checked={formData.hasNoDueDate || false}
                                    onChange={handleChange}
                                    className="rounded border-gray-300 text-primary-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">No Due Date</span>
                            </label>
                        </div>
                        {!formData.hasNoDueDate && <p className="text-xs text-gray-500 mt-1">Assignment must be due at least 1 hour from now</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <textarea name="description" required rows={4} value={formData.description} onChange={handleChange} className="input" placeholder="Describe the assignment objectives and requirements..." />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <textarea name="instructions" rows={4} value={formData.instructions} onChange={handleChange} className="input" placeholder="Detailed instructions for completing the assignment..." />
                    </div>
                </div>
            </div>

            {/* Submission Settings */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0 border-t pt-6 rounded-none' : ''}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Settings</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Submission Type</label>
                        <select name="submissionType" value={formData.submissionType} onChange={handleChange} className="input">
                            <option value="file">File Upload Only</option>
                            <option value="text">Text Submission Only</option>
                            <option value="both">Both File and Text</option>
                        </select>
                    </div>

                    {formData.submissionType !== 'text' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {fileTypes.map(type => (
                                        <label key={type.value} className="flex items-center">
                                            <input type="checkbox" checked={formData.allowedFileTypes.includes(type.value)} onChange={(e) => handleFileTypeChange(type.value, e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                                            <span className="ml-2 text-sm">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
                                <input type="number" name="maxFileSize" min="1" max="100" value={Math.round(formData.maxFileSize / 1024 / 1024)} onChange={(e) => setFormData(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) * 1024 * 1024 }))} className="input" />
                            </div>
                        </>
                    )}

                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input type="checkbox" name="allowLateSubmission" checked={formData.allowLateSubmission} onChange={handleChange} className="rounded border-gray-300 text-primary-600" />
                            <span className="ml-2 text-sm">Allow Late Submissions</span>
                        </label>
                        {formData.allowLateSubmission && (
                            <div className="flex items-center space-x-2">
                                <label className="text-sm">Penalty per day:</label>
                                <input type="number" name="latePenalty" min="0" max="100" value={formData.latePenalty} onChange={handleChange} className="input w-20" />
                                <span className="text-sm">%</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="flex items-center">
                            <input type="checkbox" name="isPublished" checked={formData.isPublished} onChange={handleChange} className="rounded border-gray-300 text-primary-600" />
                            <span className="ml-2 text-sm">Publish immediately</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Assignment Files */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0 border-t pt-6 rounded-none' : ''}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Files & Solution</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Materials</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <input type="file" multiple onChange={handleAssignmentFileChange} className="hidden" id="assignment-files" />
                                <label htmlFor="assignment-files" className="btn btn-secondary cursor-pointer">Choose Files</label>
                                <p className="text-sm text-gray-600 mt-2">Upload reference materials, templates, or instructions</p>
                            </div>
                        </div>

                        {/* Google Drive Link for Materials */}
                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Upload via Google Drive</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="url"
                                        className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors pl-10"
                                        placeholder="https://drive.google.com/file/d/.../view"
                                        value={materialsGdriveLink}
                                        onChange={(e) => setMaterialsGdriveLink(e.target.value)}
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
                                <button type="button" onClick={addMaterialsGdriveLink} className="btn btn-secondary btn-sm whitespace-nowrap">Add Link</button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Paste a Drive sharing link — file stays on Drive, nothing uploaded.</p>
                        </div>

                        {formData.attachments.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files & Links:</h4>
                                <ul className="space-y-2">
                                    {formData.attachments.map((file, index) => (
                                        <li key={index} className={`flex items-center justify-between p-3 rounded-lg ${file.type === 'link' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                {file.type === 'link' ? (
                                                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L29 52.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                                                        <path d="M43.65 25l-15.25-26.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 43.7A8.9 8.9 0 0 0 0 48.2h29z" fill="#00ac47" />
                                                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L84.7 60l-22-38h-29l14.65 25.35z" fill="#ea4335" />
                                                        <path d="M43.65 25L58.9 0H29a8.88 8.88 0 0 0-4.55 1.2l14.65 25.35 4.55-1.55z" fill="#00832d" />
                                                        <path d="M58.3 52.2H29l-15.25 26.4c1.35.8 2.9 1.2 4.55 1.2H69c1.65 0 3.2-.4 4.55-1.2z" fill="#2684fc" />
                                                        <path d="M73.4 26.5L58.9 0a8.88 8.88 0 0 0-4.55 1.2L43.65 25 62.7 48.2h24.6c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
                                                    </svg>
                                                ) : null}
                                                <span className={`text-sm truncate ${file.type === 'link' ? 'text-blue-800' : 'text-gray-600'}`}>
                                                    {file.type === 'link' ? (file.url || file.path) : file.originalName}
                                                </span>
                                            </div>
                                            <button type="button" onClick={() => removeAttachment(index)} className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"><TrashIcon className="h-4 w-4" /></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Answer/Solution Key</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <input type="file" multiple onChange={handleSolutionFileChange} className="hidden" id="solution-file" />
                                <label htmlFor="solution-file" className="btn btn-secondary cursor-pointer">Choose Solution Files</label>
                                <p className="text-sm text-gray-600 mt-2">Upload the answer key or solution PDF</p>
                            </div>
                        </div>

                        {/* Google Drive Link for Solution */}
                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Upload via Google Drive</label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="url"
                                        className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors pl-10"
                                        placeholder="https://drive.google.com/file/d/.../view"
                                        value={solutionGdriveLink}
                                        onChange={(e) => setSolutionGdriveLink(e.target.value)}
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
                                <button type="button" onClick={addSolutionGdriveLink} className="btn btn-secondary btn-sm whitespace-nowrap">Add Link</button>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Paste a Drive sharing link — file stays on Drive, nothing uploaded.</p>
                        </div>

                        {formData.solution && formData.solution.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Solutions ({formData.solution.length}):</h4>
                                <ul className="space-y-2">
                                    {formData.solution.map((sol, index) => (
                                        <li key={index} className={`flex items-center justify-between p-3 rounded-lg border ${sol.type === 'link' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                {sol.type === 'link' ? (
                                                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L29 52.2H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                                                        <path d="M43.65 25l-15.25-26.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 43.7A8.9 8.9 0 0 0 0 48.2h29z" fill="#00ac47" />
                                                        <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L84.7 60l-22-38h-29l14.65 25.35z" fill="#ea4335" />
                                                        <path d="M43.65 25L58.9 0H29a8.88 8.88 0 0 0-4.55 1.2l14.65 25.35 4.55-1.55z" fill="#00832d" />
                                                        <path d="M58.3 52.2H29l-15.25 26.4c1.35.8 2.9 1.2 4.55 1.2H69c1.65 0 3.2-.4 4.55-1.2z" fill="#2684fc" />
                                                        <path d="M73.4 26.5L58.9 0a8.88 8.88 0 0 0-4.55 1.2L43.65 25 62.7 48.2h24.6c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
                                                    </svg>
                                                ) : null}
                                                <span className={`text-sm truncate ${sol.type === 'link' ? 'text-blue-800' : 'text-green-800'}`}>
                                                    {sol.type === 'link' ? (sol.url || sol.path) : sol.originalName}
                                                </span>
                                            </div>
                                            <button type="button" onClick={() => removeSolution(index)} className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"><TrashIcon className="h-4 w-4" /></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="flex items-center">
                                <input type="checkbox" name="isSolutionVisible" checked={formData.isSolutionVisible} onChange={handleChange} className="rounded border-gray-300 text-primary-600" />
                                <span className="ml-2 text-sm">Make solution visible to students immediately</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">If unchecked, you can enable this later after the due date.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rubric */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0 border-t pt-6 rounded-none' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Grading Rubric</h2>
                    <button type="button" onClick={addRubricCriteria} className="btn btn-secondary btn-sm flex items-center"><PlusIcon className="h-4 w-4 mr-1" />Add Criteria</button>
                </div>
                {formData.rubric.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No rubric criteria added. Click "Add Criteria" to get started.</p>
                ) : (
                    <div className="space-y-4">
                        {formData.rubric.map((criteria, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                                <div className="md:col-span-4"><input type="text" placeholder="Criteria name" value={criteria.criteria} onChange={(e) => updateRubricCriteria(index, 'criteria', e.target.value)} className="input" /></div>
                                <div className="md:col-span-2"><input type="number" placeholder="Points" value={criteria.points} onChange={(e) => updateRubricCriteria(index, 'points', e.target.value)} className="input" /></div>
                                <div className="md:col-span-5"><input type="text" placeholder="Description" value={criteria.description} onChange={(e) => updateRubricCriteria(index, 'description', e.target.value)} className="input" /></div>
                                <div className="md:col-span-1"><button type="button" onClick={() => removeRubricCriteria(index)} className="btn btn-danger btn-sm w-full"><TrashIcon className="h-4 w-4" /></button></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onCancel || (() => navigate('/assignments'))} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">{loading ? 'Saving...' : (assignmentId ? 'Update Assignment' : 'Create Assignment')}</button>
            </div>
        </form>
    );
};

export default AssignmentForm;
