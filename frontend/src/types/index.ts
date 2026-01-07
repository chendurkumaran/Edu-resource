export interface Document {
  _id: string;
  type: string;
  originalName: string;
  path: string;
  uploadDate: string;
  verified?: boolean;
  comments?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface InstructorProfile {
  qualification: string;
  experience: number | string;
  linkedIn?: string;
  bio?: string;
  specialization?: string[];
  portfolio?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'instructor';
  isActive: boolean;
  isApproved: boolean;
  enrollmentDate?: string;
  createdAt?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: Address;
  profileImage?: string;
  instructorProfile?: InstructorProfile;
}

export interface Message {
  _id: string;
  sender: User;
  receiver: User;
  subject: string;
  content: string;
  isRead: boolean;
  priority: 'normal' | 'high';
  createdAt: string;
}

export interface Notification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: 'assignment' | 'assignment_due' | 'grade' | 'doc_verified' | 'doc_rejected' | 'course_approved' | 'course_rejected' | 'user_approved' | 'enrollment' | 'payment' | 'system' | 'announcement';
  isRead: boolean;
  targetId?: string;
  targetUrl?: string;
  createdAt: string;
}

export interface CourseMaterial {
  _id?: string;
  title: string;
  type: 'document' | 'video' | 'note' | 'link';
  description?: string;
  url: string;
  filename?: string;
  isFree: boolean;
  // Included directly in the interface for simplicity in frontend handling, though backend might not send it.
  file?: File | null; 
}

export interface Course {
  _id: string;
  title: string;
  courseCode: string;
  instructor: User;
  description: string;
  credits: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  fees: number;
  currentEnrollment: number;
  maxStudents: number;
  isApproved: boolean;
  enrollmentCount: number; // Keeping this if it was used elsewhere, though currentEnrollment seems preferred
  materials?: CourseMaterial[];
  prerequisites?: string[];
  category?: string;
}

export interface Pagination {
  current: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
  total?: number;
}

export interface Attachment {
  originalName: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface RubricItem {
  criteria: string;
  points: number;
  description: string;
}

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  course: Course;
  instructor: string;
  type: 'homework' | 'quiz' | 'exam' | 'project' | 'presentation';
  totalPoints: number;
  dueDate: string;
  submissionType: 'file' | 'text' | 'both';
  allowedFileTypes?: string[];
  maxFileSize: number;
  instructions?: string;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenalty?: number;
  rubric?: RubricItem[];
  attachments?: Attachment[];
  enrollmentCount?: number;
  isSubmitted?: boolean;
}

export interface Grade {
  points: number;
  feedback?: string;
  gradedBy?: User;
  gradedAt: string;
  letterGrade?: string;
  percentage: number;
}

export interface Submission {
  _id: string;
  assignment: Assignment;
  student: User;
  submissionText?: string;
  attachments?: Attachment[];
  status: 'submitted' | 'graded' | 'late';
  submittedAt: string;
  grade?: Grade;
  isLate: boolean;
  feedback?: string;
}

export interface AttendanceStudent {
  student: string | User;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface AttendanceRecord {
  _id: string;
  course: string | Course;
  date: string;
  classType: string;
  topic: string;
  duration: number;
  students: AttendanceStudent[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  // Optional method signature if we ever hydrate this, but for JSON it is not there.
  getAttendanceStats?: () => {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

export interface StudentAttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  classType: string;
  topic?: string;
}

export interface StudentCourseAttendance {
  course: Course;
  attendance: {
    totalClasses: number;
    attendedClasses: number;
    attendancePercentage: number;
  };
  records: StudentAttendanceRecord[];
}

export interface Enrollment {
  _id: string;
  student: User;
  course: Course;
  enrollmentDate: string;
  status: 'active' | 'enrolled' | 'completed' | 'dropped' | 'suspended';
  attendance?: {
    attendancePercentage: number;
    totalClasses?: number;
    attendedClasses?: number;
  };
  finalGrade?: {
    percentage: number;
    letterGrade: string;
  };
}

export interface CoursePerformance {
  courseId: string;
  courseTitle: string;
  completionRate: number;
  submissionRate: number;
  averageGrade: number;
  averageSatisfaction: number;
  totalStudents?: number;
}

export interface DashboardData {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  totalPendingGrading: number;
  recentEnrollments: Enrollment[];
}

export interface StudentGradeReport {
  _id?: string;
  course?: Course;
  letterGrade?: string;
  percentage?: number;
  gpa?: number;
  isFinalized?: boolean;
  student?: User;
}

export interface StudentDashboardData {
  enrollments: (Enrollment & { attendance?: { attendancePercentage: number } })[];
  assignments: Assignment[];
  grades: StudentGradeReport[];
}

export interface CourseStat extends Course {
  utilizationRate?: number;
}

export interface AdminDashboardData {
  totalUsers: number;
  activeCourses: number;
  totalEnrollments: number;
  pendingApprovals: number;
  recentEnrollments: Enrollment[];
  courseStats: CourseStat[];
}

export interface PlatformStats {
  totalStudents: number;
  activeCourses: number;
  satisfactionRate: number;
  uptime: number;
  supportAvailability: string;
  totalEnrollments: number;
}
