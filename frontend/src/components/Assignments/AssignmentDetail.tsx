import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  DocumentTextIcon,
  ClockIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDateLong, getTimeUntilDate, formatDateTime, isValidDate } from '../../utils/dateUtils';
import type { Assignment, Submission } from '../../types';
import BackButton from '../Common/BackButton';

const AssignmentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submissionForm, setSubmissionForm] = useState<{
    submissionText: string;
    attachments: File[];
  }>({
    submissionText: '',
    attachments: []
  });

  const handleEditClick = () => {
    if (submission) {
      setSubmissionForm({
        submissionText: submission.submissionText || '',
        attachments: [] // Reset attachments for editing, user must re-upload to replace
      });
      setIsEditing(true);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionLoading(true);

    try {
      if (!submission?._id) return;

      let uploadedAttachments: any[] | undefined = undefined;

      // Only upload if new files are selected
      if (submissionForm.attachments.length > 0) {
        uploadedAttachments = await Promise.all(
          submissionForm.attachments.map(file => uploadFile(file))
        );
      }

      await axios.put(`/api/submissions/${submission._id}`, {
        submissionText: submissionForm.submissionText,
        attachments: uploadedAttachments // If undefined, backend won't update attachments
      });

      toast.success('Submission updated successfully!');
      setIsEditing(false);
      fetchSubmission(); // Refresh submission data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update submission');
    } finally {
      setSubmissionLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssignmentDetails();
    }
    if (user?.role === 'student' && id) {
      fetchSubmission();
    }
  }, [id, user]);

  const fetchAssignmentDetails = async () => {
    try {
      const response = await axios.get(`/api/assignments/${id}`);
      setAssignment(response.data);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      toast.error('Assignment not found');
      navigate('/assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmission = async () => {
    if (!user || !id) return;
    try {
      const response = await axios.get(`/api/submissions/assignment/${id}/student/${user._id}`);
      setSubmission(response.data);
    } catch (error) {
      // No submission found - this is normal
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'document');
    formData.append('context', 'assignment-student');

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
        path: response.data.localPath.replace(/\\/g, '/'), // Store relative path for backend operations
        mimetype: response.data.mimetype
      };
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(`Failed to upload ${file.name}`);
      throw error;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    // Initial file selection update (we don't upload yet to avoid junk if they cancel)
    // But backend requires file path for submission object?
    // Wait, typical flow: user selects -> we upload -> we store URLs -> we submit URLs.
    // Or: user selects -> we store Files -> on Submit, we upload -> then submit URLs. 
    // Let's do the latter for cleaner UX if submission fails.

    setSubmissionForm(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionLoading(true);

    try {
      if (!id) return;

      let uploadedAttachments: any[] = [];
      if (submissionForm.attachments.length > 0) {
        // Filter out files that are already uploaded (if we support editing drafts later, but here they are File objects)
        // Assuming current attachments in state are File[]
        uploadedAttachments = await Promise.all(
          submissionForm.attachments.map(file => uploadFile(file))
        );
      }

      await axios.post('/api/submissions', {
        assignmentId: id,
        submissionText: submissionForm.submissionText,
        attachments: uploadedAttachments
      });

      toast.success('Assignment submitted successfully!');
      fetchSubmission(); // Refresh submission data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmissionLoading(false);
    }
  };

  const isOverdue = assignment?.dueDate && isValidDate(assignment.dueDate) ? new Date() > new Date(assignment.dueDate) : false;
  const canSubmit = user?.role === 'student' && !submission &&
    (assignment?.allowLateSubmission || !isOverdue);

  const formatDueDate = (dueDate: string) => {
    if (!dueDate) return 'No due date set';

    if (!isValidDate(dueDate)) return 'Invalid date';

    return formatDateLong(dueDate);
  };

  const getTimeUntilDue = (dueDate: string) => {
    return getTimeUntilDate(dueDate);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Assignment not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Assignment Header */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BackButton />
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-gray-600">{assignment.course?.title} • {assignment.course?.courseCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user?.role === 'instructor' && (
              <button
                onClick={() => navigate(`/assignments/edit/${id}`)}
                className="btn btn-secondary btn-sm flex items-center"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}

            {submission ? (
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="h-6 w-6 mr-2" />
                <span className="font-medium">Submitted</span>
              </div>
            ) : isOverdue ? (
              <div className="flex items-center text-red-600">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                <span className="font-medium">Overdue</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-600">
                <ClockIcon className="h-6 w-6 mr-2" />
                <span className="font-medium">Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Due Date</p>
            <p className="text-lg font-semibold">{formatDueDate(assignment.dueDate)}</p>
            {assignment.dueDate && (
              <p className={`text-sm mt-1 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                {getTimeUntilDue(assignment.dueDate)}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Points</p>
            <p className="text-lg font-semibold">{assignment.totalPoints}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Type</p>
            <p className="text-lg font-semibold capitalize">{assignment.type}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
        </div>

        {assignment.instructions && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        {/* Assignment Attachments */}
        {(assignment.attachments?.length ?? 0) > 0 && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Assignment Files</h3>
            <div className="space-y-2">
              {assignment.attachments?.map((attachment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <PaperClipIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{attachment.originalName}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const path = attachment.path;
                        const url = path.startsWith('http') ? path : `http://localhost:5000${path}`;
                        window.open(url, '_blank');
                      }}
                      className="btn btn-secondary btn-sm p-2"
                      title="View"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <a
                      href={attachment.path.startsWith('http') ? attachment.path : `http://localhost:5000${attachment.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Answer/Solution Files */}
      {assignment.solution && assignment.solution.length > 0 && (
        (user?.role === 'instructor' || user?.role === 'admin') ||
        (assignment.isSolutionVisible)
      ) && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
              Solution Key ({assignment.solution.length})
              {user?.role === 'instructor' && !assignment.isSolutionVisible && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  Hidden from Students
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {assignment.solution.map((sol: any, solIdx: number) => (
                <div key={solIdx} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-gray-900 font-medium">{sol.originalName}</p>
                      <p className="text-xs text-green-700 mt-0.5">{sol.type === 'link' ? 'Google Drive Link' : 'Uploaded File'}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const path = sol.url || sol.path;
                        const url = path.startsWith('http') ? path : `http://localhost:5000${path}`;
                        window.open(url, '_blank');
                      }}
                      className="btn bg-white border border-green-200 text-green-700 hover:bg-green-100 btn-sm p-2"
                      title="View Solution"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    {sol.type !== 'link' && (
                      <a
                        href={sol.path.startsWith('http') ? sol.path : `http://localhost:5000${sol.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn bg-white border border-green-200 text-green-700 hover:bg-green-100 btn-sm"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


      {/* Submission Section */}
      {
        user?.role === 'student' && (
          <>
            {submission && !isEditing ? (
              /* Existing Submission View */
              <div className="card">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Your Submission</h2>
                  {submission.status !== 'graded' && (assignment.allowLateSubmission || !isOverdue) && (
                    <button
                      onClick={handleEditClick}
                      className="btn btn-secondary btn-sm flex items-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit Submission
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Submitted:</span>
                      <p>{formatDateTime(submission.submittedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <p className={`font-medium ${submission.status === 'submitted' ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </p>
                    </div>
                  </div>

                  {submission.submissionText && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Text Submission</h4>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="whitespace-pre-wrap">{submission.submissionText}</p>
                      </div>
                    </div>
                  )}

                  {(submission.attachments?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Submitted Files</h4>
                      <div className="space-y-2">
                        {submission.attachments?.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <PaperClipIcon className="h-5 w-5 text-gray-400 mr-3" />
                              <span>{attachment.originalName}</span>
                            </div>
                            <a
                              href={`/api${attachment.path}`}
                              download
                              className="btn btn-secondary btn-sm"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {submission.feedback && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Instructor Feedback</h4>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="whitespace-pre-wrap">{submission.feedback}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (canSubmit || isEditing) ? (
              /* Submission/Edit Form */
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {isEditing ? 'Edit Submission' : 'Submit Assignment'}
                </h2>

                {isEditing && (
                  <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                    Warning: Uploading new files will replace your existing submitted files.
                  </div>
                )}

                <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-6">
                  {assignment.submissionType !== 'file' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Submission
                      </label>
                      <textarea
                        rows={6}
                        value={submissionForm.submissionText}
                        onChange={(e) => setSubmissionForm(prev => ({ ...prev, submissionText: e.target.value }))}
                        className="input"
                        placeholder="Enter your submission text here..."
                        required={assignment.submissionType === 'text'}
                      />
                    </div>
                  )}

                  {assignment.submissionType !== 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File Attachments
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                            accept={assignment.allowedFileTypes?.map(type => `.${type}`).join(',')}
                          />
                          <label htmlFor="file-upload" className="btn btn-secondary cursor-pointer">
                            Choose Files
                          </label>
                          <p className="text-sm text-gray-600 mt-2">
                            Allowed types: {assignment.allowedFileTypes?.join(', ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Max size: {Math.round(assignment.maxFileSize / 1024 / 1024)}MB per file
                          </p>
                        </div>
                      </div>

                      {submissionForm.attachments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h4>
                          <ul className="space-y-1">
                            {submissionForm.attachments.map((file, index) => (
                              <li key={index} className="text-sm text-gray-600">
                                {file.name} ({Math.round(file.size / 1024)}KB)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setIsEditing(false);
                          setSubmissionForm({ submissionText: '', attachments: [] });
                        } else {
                          navigate('/assignments');
                        }
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submissionLoading}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {submissionLoading ? 'Saving...' : (isEditing ? 'Update Submission' : 'Submit Assignment')}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Cannot Submit */
              <div className="card">
                <div className="text-center py-8">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {isOverdue ? 'Assignment Overdue' : 'Submission Closed'}
                  </h3>
                  <p className="text-gray-600">
                    {isOverdue
                      ? 'This assignment is past the due date and late submissions are not allowed.'
                      : 'The submission period for this assignment has ended.'
                    }
                  </p>
                </div>
              </div>
            )}
          </>
        )
      }
    </div>
  );
};

export default AssignmentDetail;

