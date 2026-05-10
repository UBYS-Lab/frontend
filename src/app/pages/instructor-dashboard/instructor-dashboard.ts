import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, CourseItem, PendingGradeItem, RegistrationRequest, CourseGradeStudent } from '../../services/dashboard.service';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructor-dashboard.html',
  styleUrl: './instructor-dashboard.css',
})
export class InstructorDashboardComponent implements OnInit {
  user: UserInfo | null = null;
  activeNav = 'panel';
  loading = true;

  courses: CourseItem[] = [];
  pendingGrades: PendingGradeItem[] = [];
  activeSemester = '';
  registrationRequests: RegistrationRequest[] = [];
  feedbackMap: Record<string, string> = {};
  reviewingId: string | null = null;

  // Not girişi
  selectedGradeCourse: CourseItem | null = null;
  gradeStudents: CourseGradeStudent[] = [];
  gradeInputs: Record<string, { midterm: number | null; final: number | null; homework: number | null }> = {};
  gradeSaving = false;
  gradeSaveMsg = '';

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private dashService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.user = this.authService.getUser();
    if (!this.user) return;

    this.dashService.getInstructorCourses(this.user.identifier).subscribe({
      next: (res) => {
        this.courses = res.courses ?? [];
        this.activeSemester = res.semester ?? '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });

    this.dashService.getPendingGrades(this.user.identifier).subscribe({
      next: (res) => { this.pendingGrades = res.pending ?? []; this.cdr.detectChanges(); },
      error: () => {},
    });

    this.dashService.getRegistrationRequests(this.user.identifier).subscribe({
      next: (res) => { this.registrationRequests = res.requests ?? []; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  get pendingRequestCount(): number {
    return this.registrationRequests.filter(r => r.status === 'pending').length;
  }

  get pendingRequests(): RegistrationRequest[] {
    return this.registrationRequests.filter(r => r.status === 'pending');
  }

  review(req: RegistrationRequest, action: 'approve' | 'reject'): void {
    if (this.reviewingId === req.id) return;
    this.reviewingId = req.id;
    const feedback = this.feedbackMap[req.id] ?? '';
    this.dashService.reviewRegistrationRequest(req.id, this.user!.identifier, action, feedback).subscribe({
      next: () => {
        req.status   = action === 'approve' ? 'approved' : 'rejected';
        req.feedback = feedback || null;
        this.reviewingId = null;
      },
      error: () => { this.reviewingId = null; },
    });
  }

  todaySchedule(): { start: string; end: string; code: string; name: string; section: string; room: string; count: number }[] {
    const days: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
    const today = days[new Date().getDay()];
    const result: any[] = [];
    for (const c of this.courses) {
      for (const slot of c.schedule) {
        if (slot.day === today) {
          result.push({ start: slot.start_time, end: slot.end_time, code: c.course_code, name: c.course_name, section: c.section, room: slot.classroom, count: c.enrolled_count });
        }
      }
    }
    return result.sort((a, b) => a.start.localeCompare(b.start));
  }

  hasPendingForCourse(courseCode: string): boolean {
    return this.pendingGrades.some(p => p.course_code === courseCode);
  }

  get firstName(): string {
    return this.user?.full_name?.split(' ').slice(-1)[0] ?? '';
  }

  get totalStudents(): number {
    return this.courses.reduce((s, c) => s + c.enrolled_count, 0);
  }

  setNav(nav: string) {
    this.activeNav = nav;
    if (nav !== 'notlar') { this.selectedGradeCourse = null; this.gradeStudents = []; }
  }

  selectGradeCourse(course: CourseItem): void {
    this.selectedGradeCourse = course;
    this.gradeStudents = [];
    this.gradeInputs = {};
    this.gradeSaveMsg = '';
    this.dashService.getCourseGrades(this.user!.identifier, course.course_code).subscribe({
      next: (res) => {
        this.gradeStudents = res.students ?? [];
        this.gradeStudents.forEach(s => {
          this.gradeInputs[s.student_no] = {
            midterm:  s.midterm,
            final:    s.final,
            homework: s.homework,
          };
        });
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  calcPreview(studentNo: string): string {
    const inp = this.gradeInputs[studentNo];
    if (!inp || inp.midterm === null || inp.final === null) return '—';
    const hw  = inp.homework ?? 0;
    const raw = Math.round(inp.midterm * 0.3 + inp.final * 0.5 + hw * 0.2);
    if (raw >= 90) return 'AA';
    if (raw >= 85) return 'BA';
    if (raw >= 75) return 'BB';
    if (raw >= 70) return 'CB';
    if (raw >= 60) return 'CC';
    if (raw >= 55) return 'DC';
    if (raw >= 50) return 'DD';
    if (raw >= 30) return 'FD';
    return 'FF';
  }

  isPassing(studentNo: string): boolean {
    const l = this.calcPreview(studentNo);
    return ['AA','BA','BB','CB','CC'].includes(l);
  }

  saveGrades(): void {
    if (!this.selectedGradeCourse || this.gradeSaving) return;
    const payload = this.gradeStudents
      .filter(s => this.gradeInputs[s.student_no]?.midterm !== null && this.gradeInputs[s.student_no]?.final !== null)
      .map(s => ({
        student_no: s.student_no,
        midterm:    this.gradeInputs[s.student_no].midterm!,
        final:      this.gradeInputs[s.student_no].final!,
        homework:   this.gradeInputs[s.student_no].homework ?? 0,
      }));

    if (payload.length === 0) { this.gradeSaveMsg = 'Kaydedilecek not yok.'; return; }

    this.gradeSaving = true;
    this.gradeSaveMsg = '';
    this.dashService.batchEnterGrades(
      this.user!.identifier,
      this.selectedGradeCourse.course_code,
      this.activeSemester,
      payload
    ).subscribe({
      next: (res) => {
        this.gradeSaving = false;
        this.gradeSaveMsg = `${res.count} öğrencinin notu kaydedildi.`;
        this.selectGradeCourse(this.selectedGradeCourse!);
        this.dashService.getPendingGrades(this.user!.identifier).subscribe({
          next: (r) => { this.pendingGrades = r.pending ?? []; this.cdr.detectChanges(); }
        });
        this.cdr.detectChanges();
      },
      error: () => { this.gradeSaving = false; this.gradeSaveMsg = 'Hata oluştu.'; this.cdr.detectChanges(); },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
