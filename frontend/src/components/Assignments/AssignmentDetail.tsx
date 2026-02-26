import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  DocumentTextIcon,
  ClockIcon,
  PaperClipIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDateLong, getTimeUntilDate, isValidDate } from '../../utils/dateUtils';
import type { Assignment } from '../../types';
import BackButton from '../Common/BackButton';

const AssignmentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAssignmentDetails();
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

  const isOverdue = assignment?.dueDate && isValidDate(assignment.dueDate)
    ? new Date() > new Date(assignment.dueDate)
    : false;

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

            {isOverdue ? (
              <div className="flex items-center text-orange-600">
                <ClockIcon className="h-6 w-6 mr-2" />
                <span className="font-medium">Past Due</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-600">
                <ClockIcon className="h-6 w-6 mr-2" />
                <span className="font-medium">Open</span>
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
              {assignment.attachments?.map((attachment: any, index: number) => {
                const href = attachment.url || attachment.path || '#';
                const fullUrl = href.startsWith('http')
                  ? href
                  : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${href}`;
                return (
                  <a
                    key={index}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <PaperClipIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900 font-medium">{attachment.originalName || 'View Attachment'}</span>
                    </div>
                    <EyeIcon className="h-4 w-4 text-blue-400" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Solution Key */}
      {assignment.solution && assignment.solution.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-green-600" />
            Solution Key ({assignment.solution.length})
          </h3>
          <div className="space-y-3">
            {assignment.solution.map((sol: any, solIdx: number) => {
              const href = sol.url || sol.path || '#';
              const fullUrl = href.startsWith('http')
                ? href
                : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${href}`;
              return (
                <a
                  key={solIdx}
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-gray-900 font-medium">{sol.originalName}</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        {sol.type === 'link' ? 'Google Drive Link' : 'Uploaded File'}
                      </p>
                    </div>
                  </div>
                  <EyeIcon className="h-4 w-4 text-green-600" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetail;
