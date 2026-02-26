import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  DocumentTextIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDateTime, isValidDate } from '../../utils/dateUtils';
import type { Assignment, Course } from '../../types';

const AssignmentList = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  // Maps assignmentId -> { courseTitle, moduleName }
  // Maps assignmentId -> array of { courseTitle, moduleName } (multiple modules possible)
  const [moduleMap, setModuleMap] = useState<Record<string, { courseTitle: string; moduleName: string }[]>>({});

  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setShowCourseDropdown(false);
      }
    };
    if (showCourseDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCourseDropdown]);

  useEffect(() => {
    fetchAssignments();
    if (user?.role === 'student') {
      fetchEnrolledCourses();
    } else if (user?.role === 'instructor') {
      fetchInstructorCourses();
    }
  }, [user]);

  useEffect(() => {
    fetchAssignments();
  }, [selectedCourse]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      let url = '/api/assignments';

      if (selectedCourse) {
        url = `/api/assignments/course/${selectedCourse}`;
      }

      const response = await axios.get(url);
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`/api/enrollments/student/${user._id}`);
      setCourses(response.data.map((enrollment: any) => enrollment.course));
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchInstructorCourses = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`/api/courses/instructor/${user._id}`);
      const coursesData: any[] = response.data;
      setCourses(coursesData);

      // Build assignmentId -> [{ courseTitle, moduleName }, ...] lookup (supports multi-module)
      const map: Record<string, { courseTitle: string; moduleName: string }[]> = {};
      for (const course of coursesData) {
        const modules: any[] = course.modules || [];
        for (const mod of modules) {
          const assignIds: string[] = (mod.assignments || []).map((a: any) =>
            typeof a === 'object' ? a._id?.toString() : a?.toString()
          );
          for (const aid of assignIds) {
            if (aid) {
              if (!map[aid]) map[aid] = [];
              map[aid].push({ courseTitle: course.title, moduleName: mod.title });
            }
          }
        }
      }
      setModuleMap(map);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if wrapped in link
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      await axios.delete(`/api/assignments/${id}`);
      setAssignments(prev => prev.filter(a => a._id !== id));
      toast.success('Assignment deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const formatDueDate = (dueDate: string) => {
    if (!dueDate) return 'No due date';
    if (!isValidDate(dueDate)) return 'Invalid date';
    return formatDateTime(dueDate);
  };

  const formatCreatedAt = (createdAt?: string) => {
    if (!createdAt) return '—';
    try {
      return new Date(createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return '—'; }
  };


  const getStatusIcon = (assignment: Assignment) => {
    if (!assignment.dueDate) return <ClockIcon className="h-5 w-5 text-gray-500" />;
    const dueDate = new Date(assignment.dueDate);
    if (isNaN(dueDate.getTime())) return <ClockIcon className="h-5 w-5 text-gray-500" />;
    const now = new Date();
    if (dueDate < now) return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    return <ClockIcon className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = (assignment: Assignment) => {
    if (!assignment.dueDate) return 'No Due Date';
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    return dueDate < now ? 'Completed' : 'Pending';
  };

  const getStatusColor = (assignment: Assignment) => {
    if (!assignment.dueDate) return 'text-gray-500';
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();
    return dueDate < now ? 'text-green-600' : 'text-yellow-600';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="mt-2 text-gray-600">View course assignments</p>
        </div>

        {user?.role === 'instructor' && ( // Removed admin from create assignment button
          <Link
            to="/create-assignment"
            className="mt-4 sm:mt-0 btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Assignment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Course
            </label>
            <div ref={courseDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setShowCourseDropdown(o => !o)}
                className="input w-full flex items-center justify-between text-left gap-2"
              >
                <span className={selectedCourse ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedCourse ? courses.find(c => c._id === selectedCourse)?.title || 'Selected Course' : 'All Courses'}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-400 transition-transform duration-150 ${showCourseDropdown ? 'rotate-180' : ''}`}
                />
              </button>
              {showCourseDropdown && (
                <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedCourse(''); setShowCourseDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedCourse === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'}`}
                    >
                      All Courses
                    </button>
                    {courses.map((course) => (
                      <button
                        key={course._id}
                        type="button"
                        onClick={() => { setSelectedCourse(course._id); setShowCourseDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${selectedCourse === course._id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}`}
                      >
                        {course.title} ({course.courseCode})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setSelectedCourse('')}
              className="btn btn-secondary flex items-center"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Assignment List */}
      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
          <p className="text-gray-600">
            {user?.role === 'student'
              ? 'No assignments available for your enrolled courses'
              : user?.role === 'instructor'
                ? 'Create your first assignment to get started'
                : 'No published assignments available'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    {getStatusIcon(assignment)}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {assignment.title}
                    </h3>
                    <span className={`text-sm font-medium ${getStatusColor(assignment)}`}>
                      {getStatusText(assignment)}
                    </span>
                  </div>

                  {/* Course / Module breadcrumb — shows all linked modules */}
                  {(() => {
                    const entries = moduleMap[assignment._id];
                    // Fallback: single course from assignment.course if no module map entries
                    const fallbackTitle = assignment.course?.title;
                    if (!entries?.length && !fallbackTitle) return null;

                    const items: { courseTitle: string; moduleName?: string }[] =
                      entries?.length
                        ? entries
                        : [{ courseTitle: fallbackTitle! }];

                    return (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mb-2 overflow-hidden">
                        <BookOpenIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        {/* Flex-truncating list: items are flex children, container clips */}
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                          {items.map((item, idx) => (
                            <span key={idx} className="flex items-center gap-1 flex-shrink-0">
                              {idx > 0 && (
                                <span className="text-gray-400 font-bold mx-0.5">|</span>
                              )}
                              <span className="truncate max-w-[160px]">{item.courseTitle}</span>
                              {item.moduleName && (
                                <>
                                  <span className="text-gray-400 font-normal">/</span>
                                  <span className="text-indigo-500 truncate max-w-[140px]">{item.moduleName}</span>
                                </>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {assignment.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-sm text-gray-600">
                    <div><span className="font-medium">Type:</span> <span className="capitalize">{assignment.type}</span></div>
                    <div><span className="font-medium">Points:</span> {assignment.totalPoints}</div>
                    <div><span className="font-medium">Due:</span> {formatDueDate(assignment.dueDate)}</div>
                    <div className="flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-medium">Created:</span>&nbsp;{formatCreatedAt((assignment as any).createdAt)}
                    </div>
                  </div>
                </div>

                <div className="ml-6 flex flex-col space-y-2">
                  <Link to={`/assignments/${assignment._id}`} className="btn btn-primary text-center">
                    View Details
                  </Link>
                  {user?.role === 'instructor' && assignment.instructor === user._id && (
                    <div className="flex space-x-2">
                      <Link to={`/assignments/edit/${assignment._id}`} className="btn btn-secondary flex-1 flex justify-center py-2" title="Edit Assignment">
                        <PencilIcon className="h-5 w-5 text-blue-600" />
                      </Link>
                      <button onClick={(e) => handleDelete(assignment._id, e)} className="btn btn-secondary flex-1 flex justify-center py-2" title="Delete Assignment">
                        <TrashIcon className="h-5 w-5 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
