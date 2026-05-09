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

export interface AnnouncementItem {
  title: string;
  content: string;
  priority: string;
  date: string;
  publisher?: string;
  audience?: string;
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

  getStudentGrades(studentNo: string): Observable<{ success: boolean; grades: GradeItem[] }> {
    return this.http.get<any>(`${this.API}/student/grades`, { params: { student_no: studentNo } });
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
