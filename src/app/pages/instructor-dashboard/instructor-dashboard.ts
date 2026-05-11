import { Component, OnInit, OnDestroy, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
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
export class InstructorDashboardComponent implements OnInit, OnDestroy {
  user: UserInfo | null = null;
  activeNav = 'panel';
  loading = true;

  courses: CourseItem[] = [];
  pendingGrades: PendingGradeItem[] = [];
  activeSemester = '';
  registrationRequests: RegistrationRequest[] = [];
  feedbackMap: Record<string, string> = {};
  reviewingId: string | null = null;

  // Yoklama
  attCourse: CourseItem | null = null;
  attSession: any = null;
  attSessionLoading = false;
  attStudentStatus: Record<string, 'present' | 'absent' | 'late'> = {};
  attQrExpiry: Date | null = null;
  attQrTimer = '';
  private attTimerRef: any = null;
  attCourseReport: any[] = [];
  attReportLoading = false;
  attHistoryCourse: CourseItem | null = null;
  attHistory: any[] = [];
  attHistoryLoading = false;
  attStudents: { student_no: string; name: string; status: 'present' | 'absent' | 'late' }[] = [];
  private attPollRef: any = null;
  loadingCourseCode = '';
  serverLanIp = '';
  ngrokOrigin = '';
  ngrokChecked = false;

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

    this.dashService.getHostIp().subscribe({
      next: (res) => { this.serverLanIp = res.ip; this.cdr.detectChanges(); },
    });

    fetch('/ngrok-url')
      .then(r => r.json())
      .then((d: any) => { if (d?.url) this.ngrokOrigin = d.url; })
      .catch(() => {})
      .finally(() => { this.ngrokChecked = true; this.cdr.detectChanges(); });

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

  showAttHistory(course: CourseItem): void {
    this.attHistoryCourse = course;
    this.attHistoryLoading = true;
    this.attHistory = [];
    this.cdr.detectChanges();
    this.dashService.getCourseAttendanceReport(course.course_code, course.section).subscribe({
      next: (res) => { this.attHistory = res.sessions ?? []; this.attHistoryLoading = false; this.cdr.detectChanges(); },
      error: () => { this.attHistoryLoading = false; this.cdr.detectChanges(); },
    });
  }

  setNav(nav: string) {
    this.activeNav = nav;
    if (nav !== 'notlar') { this.selectedGradeCourse = null; this.gradeStudents = []; }
    if (nav === 'devamsizlik') {
      const saved = localStorage.getItem('att_session_id');
      if (saved && !this.attSession) {
        this.dashService.getSessionStatus(saved).subscribe({
          next: (res) => {
            if (res.success && !res.is_closed) {
              this.attSession = res;
              if (res.students) {
                this.attStudents = res.students;
                this.attStudentStatus = Object.fromEntries(
                  res.students.map((s: any) => [s.student_no, s.status])
                );
              }
              if (res.expires_at) {
                this.attQrExpiry = new Date(res.expires_at);
                this.startQrTimer();
              }
              this.startPolling(saved);
              this.cdr.detectChanges();
            } else {
              localStorage.removeItem('att_session_id');
            }
          },
          error: () => localStorage.removeItem('att_session_id'),
        });
      }
    } else if (nav !== 'devamsizlik') {
      this.attSession = null;
      this.attCourse = null;
      this.attStudents = [];
      clearInterval(this.attTimerRef);
      clearInterval(this.attPollRef);
    }
  }

  get qrUrl(): string {
    if (!this.attSession?.qr_token) return '';
    const origin = this.ngrokOrigin || window.location.origin;
    return `${origin}/qr-checkin?token=${this.attSession.qr_token}`;
  }

  get qrImageUrl(): string {
    const url = this.qrUrl;
    return url ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}` : '';
  }

  startSession(course: CourseItem): void {
    if (!this.user || this.loadingCourseCode) return;
    this.loadingCourseCode = course.course_code;
    this.attSessionLoading = true;
    this.dashService.createAttendanceSession(this.user.identifier, course.course_code, course.section).subscribe({
      next: (res) => {
        this.attCourse  = course;
        this.attSession = res;
        this.attQrExpiry = new Date(res.expires_at);
        this.attStudentStatus = {};
        this.attStudents = [];
        this.attSessionLoading = false;
        this.loadingCourseCode = '';
        localStorage.setItem('att_session_id', res.session_id);
        this.startQrTimer();
        this.startPolling(res.session_id);
        this.refreshSession(res.session_id);
        this.cdr.detectChanges();
      },
      error: () => { this.attSessionLoading = false; this.loadingCourseCode = ''; this.cdr.detectChanges(); },
    });
  }

  refreshSession(sessionId: string): void {
    this.dashService.getSessionStatus(sessionId).subscribe({
      next: (res) => {
        this.attSession = res;
        if (res.students) {
          this.attStudents = res.students;
          this.attStudentStatus = Object.fromEntries(
            res.students.map((s: any) => [s.student_no, s.status])
          );
        }
        if (res.expires_at) this.attQrExpiry = new Date(res.expires_at);
        if (res.is_closed) { clearInterval(this.attPollRef); clearInterval(this.attTimerRef); }
        this.cdr.detectChanges();
      },
    });
  }

  markAtt(studentNo: string, status: 'present' | 'absent' | 'late'): void {
    if (!this.attSession) return;
    this.attStudentStatus[studentNo] = status;
    this.dashService.markStudent(this.attSession.session_id, studentNo, status).subscribe();
  }

  closeAttSession(): void {
    if (!this.attSession) return;
    this.dashService.closeSession(this.attSession.session_id).subscribe({
      next: () => {
        clearInterval(this.attTimerRef);
        clearInterval(this.attPollRef);
        localStorage.removeItem('att_session_id');
        this.attSession.is_closed = true;
        this.cdr.detectChanges();
      },
    });
  }

  loadAttReport(course: CourseItem): void {
    this.attReportLoading = true;
    this.dashService.getCourseAttendanceReport(course.course_code, course.section).subscribe({
      next: (res) => { this.attCourseReport = res.sessions ?? []; this.attReportLoading = false; this.cdr.detectChanges(); },
      error: () => { this.attReportLoading = false; this.cdr.detectChanges(); },
    });
  }

  private startPolling(sessionId: string): void {
    clearInterval(this.attPollRef);
    this.attPollRef = setInterval(() => {
      if (!this.attSession?.is_closed) this.refreshSession(sessionId);
      else clearInterval(this.attPollRef);
    }, 5000);
  }

  private startQrTimer(): void {
    clearInterval(this.attTimerRef);
    this.attTimerRef = setInterval(() => {
      if (!this.attQrExpiry) return;
      const diff = Math.max(0, this.attQrExpiry.getTime() - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.attQrTimer = diff > 0 ? `${m}:${s.toString().padStart(2,'0')}` : 'Süresi doldu';
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.attTimerRef);
    clearInterval(this.attPollRef);
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
