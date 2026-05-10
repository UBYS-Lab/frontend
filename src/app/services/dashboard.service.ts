import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ScheduleItem {
  course_code: string;
  course_name: string;
  section: string;
  instructor: string;
  status: string;
  schedule: { day: string; start_time: string; end_time: string; classroom: string }[];
}

export interface AnnouncementComment {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  priority: string;
  date: string;
  publisher?: string;
  likes: number;
  reactions: { like: number; love: number; wow: number; haha: number };
  comments: AnnouncementComment[];
}

export interface GradeItem {
  course_code: string;
  semester: string;
  raw_score: number;
  letter_grade: string;
  grade_point: number;
  is_passing: boolean;
}

export interface CourseItem {
  course_code: string;
  course_name: string;
  section: string;
  enrolled_count: number;
  capacity: number;
  schedule: { day: string; start_time: string; end_time: string; classroom: string }[];
}

export interface PendingGradeItem {
  student_no: string;
  name: string;
  course_code: string;
  section: string;
}

export interface ManagerStats {
  students: number;
  instructors: number;
  courses: number;
  departments: number;
}

export interface ActivityItem {
  type: string;
  text: string;
  time: string;
  date: string;
}

export interface AvailableCourse {
  course_code: string;
  course_name: string;
  credits: number;
  ects: number;
  type: string;
  class_year: number;
  section: string;
  instructor: string;
  instructor_id: string;
  capacity: number;
  enrolled_count: number;
  schedule: { day: string; start_time: string; end_time: string; classroom: string }[];
  already_enrolled: boolean;
}

export interface TranscriptCourse {
  course_code: string;
  course_name: string;
  credits: number;
  midterm: number | null;
  final: number | null;
  homework: number | null;
  raw_score: number | null;
  letter_grade: string | null;
  grade_point: number | null;
  is_passing: boolean | null;
}

export interface SemesterSummary {
  semester_name: string;
  courses: TranscriptCourse[];
  yano: number;
  credits_taken: number;
  passed_count: number;
  failed_count: number;
  needs_repeat: boolean;
}

export interface Transcript {
  student: { student_no: string; full_name: string; department_id: number; class_year: number; status: string };
  semesters: SemesterSummary[];
  gano: number;
  total_credits: number;
  repeat_semesters: SemesterSummary[];
  pending_courses: { course_code: string; course_name: string; credits: number }[];
  active_semester: string;
}

export interface CourseGradeStudent {
  student_no: string;
  student_name: string;
  midterm: number | null;
  final: number | null;
  homework: number | null;
  raw_score: number | null;
  letter_grade: string | null;
  grade_point: number | null;
  is_passing: boolean | null;
  graded: boolean;
}

export interface RegistrationRequest {
  id: string;
  student_no: string;
  student_name: string;
  department_id: number;
  courses: { course_code: string; course_name: string; credits: number; section: string }[];
  total_credits: number;
  status: 'pending' | 'approved' | 'rejected';
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API = 'http://127.0.0.1:8001/api';
  private http = inject(HttpClient);

  // ── Student ──────────────────────────────────────────────────
  getStudentSchedule(studentNo: string): Observable<{ success: boolean; semester: string; schedule: ScheduleItem[] }> {
    return this.http.get<any>(`${this.API}/student/schedule`, { params: { student_no: studentNo } });
  }

  getStudentAnnouncements(departmentId: number): Observable<{ success: boolean; announcements: AnnouncementItem[] }> {
    return this.http.get<any>(`${this.API}/student/announcements`, { params: { department_id: String(departmentId) } });
  }

  getAllAnnouncements(departmentId: number): Observable<{ success: boolean; announcements: AnnouncementItem[] }> {
    return this.http.get<any>(`${this.API}/announcements`, { params: { department_id: String(departmentId) } });
  }

  getAnnouncement(id: string): Observable<{ success: boolean; announcement: AnnouncementItem }> {
    return this.http.get<any>(`${this.API}/announcements/${id}`);
  }

  likeAnnouncement(id: string, studentNo: string): Observable<{ success: boolean; likes: number; liked: boolean }> {
    return this.http.post<any>(`${this.API}/announcements/${id}/like`, { student_no: studentNo });
  }

  reactAnnouncement(id: string, studentNo: string, reaction: string): Observable<{ success: boolean; reactions: any; my_reaction: string | null }> {
    return this.http.post<any>(`${this.API}/announcements/${id}/react`, { student_no: studentNo, reaction });
  }

  commentAnnouncement(id: string, studentNo: string, studentName: string, text: string): Observable<{ success: boolean; comment: AnnouncementComment; total: number }> {
    return this.http.post<any>(`${this.API}/announcements/${id}/comment`, { student_no: studentNo, student_name: studentName, text });
  }

  getStudentGrades(studentNo: string): Observable<{ success: boolean; grades: GradeItem[] }> {
    return this.http.get<any>(`${this.API}/student/grades`, { params: { student_no: studentNo } });
  }

  getAvailableCourses(studentNo: string): Observable<{ success: boolean; semester: string; credits_allowed: number; existing_request: any; courses: AvailableCourse[] }> {
    return this.http.get<any>(`${this.API}/student/available-courses`, { params: { student_no: studentNo } });
  }

  submitRegistrationRequest(studentNo: string, courseCodes: string[]): Observable<{ success: boolean; message: string; request_id: string }> {
    return this.http.post<any>(`${this.API}/student/registration-request`, { student_no: studentNo, course_codes: courseCodes });
  }

  getRegistrationStatus(studentNo: string): Observable<{ success: boolean; request: RegistrationRequest | null }> {
    return this.http.get<any>(`${this.API}/student/registration-status`, { params: { student_no: studentNo } });
  }

  getTranscript(studentNo: string): Observable<{ success: boolean } & Transcript> {
    return this.http.get<any>(`${this.API}/student/transcript`, { params: { student_no: studentNo } });
  }

  // ── Instructor ───────────────────────────────────────────────
  getInstructorCourses(instructorId: string): Observable<{ success: boolean; semester: string; courses: CourseItem[] }> {
    return this.http.get<any>(`${this.API}/instructor/courses`, { params: { instructor_id: instructorId } });
  }

  getPendingGrades(instructorId: string): Observable<{ success: boolean; pending: PendingGradeItem[] }> {
    return this.http.get<any>(`${this.API}/instructor/pending-grades`, { params: { instructor_id: instructorId } });
  }

  getInstructorAnnouncements(): Observable<{ success: boolean; announcements: AnnouncementItem[] }> {
    return this.http.get<any>(`${this.API}/instructor/announcements`);
  }

  getRegistrationRequests(instructorId: string): Observable<{ success: boolean; requests: RegistrationRequest[] }> {
    return this.http.get<any>(`${this.API}/instructor/registration-requests`, { params: { instructor_id: instructorId } });
  }

  reviewRegistrationRequest(requestId: string, instructorId: string, action: 'approve' | 'reject', feedback: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.API}/instructor/registration-requests/${requestId}/review`, { instructor_id: instructorId, action, feedback });
  }

  getCourseGrades(instructorId: string, courseCode: string): Observable<{ success: boolean; course_code: string; course_name: string; credits: number; semester_name: string; students: CourseGradeStudent[] }> {
    return this.http.get<any>(`${this.API}/instructor/course-grades`, { params: { instructor_id: instructorId, course_code: courseCode } });
  }

  batchEnterGrades(instructorId: string, courseCode: string, semesterName: string, grades: { student_no: string; midterm: number; final: number; homework: number }[]): Observable<{ success: boolean; count: number; results: any[] }> {
    return this.http.post<any>(`${this.API}/instructor/course-grades/batch`, { instructor_id: instructorId, course_code: courseCode, semester_name: semesterName, grades });
  }

  // ── Manager ──────────────────────────────────────────────────
  getManagerStats(): Observable<{ success: boolean; stats: ManagerStats }> {
    return this.http.get<any>(`${this.API}/manager/stats`);
  }

  getManagerActivities(): Observable<{ success: boolean; activities: ActivityItem[] }> {
    return this.http.get<any>(`${this.API}/manager/activities`);
  }

  getManagerAnnouncements(): Observable<{ success: boolean; announcements: AnnouncementItem[] }> {
    return this.http.get<any>(`${this.API}/manager/announcements`);
  }
}
