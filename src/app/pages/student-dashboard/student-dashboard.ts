import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, ScheduleItem, AnnouncementItem, AnnouncementComment, Transcript, SemesterSummary } from '../../services/dashboard.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [DecimalPipe, CommonModule, FormsModule],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
})
export class StudentDashboardComponent implements OnInit {
  user: UserInfo | null = null;
  activeNav = 'panel';
  loading = true;

  announcements: AnnouncementItem[] = [];
  scheduleItems: ScheduleItem[] = [];
  activeSemester = '';

  transcript: Transcript | null = null;
  transcriptLoading = false;

  allAnnouncements: AnnouncementItem[] = [];
  allAnnLoading = false;
  selectedAnn: AnnouncementItem | null = null;
  myReaction: string | null = null;
  myLiked = false;
  commentText = '';
  commentSubmitting = false;

  // Ödevler
  studentAssignments: any[] = [];
  assignmentsLoading = false;
  selectedUploadAssignment: any = null;
  uploadFiles: File[] = [];
  uploadProgress = false;
  uploadMsg = '';
  uploadSuccess = false;

  attendanceSummary: any[] = [];
  attendanceLoading = false;
  qrTokenInput = '';
  qrSubmitting = false;
  qrMessage = '';
  qrSuccess = false;

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

    this.dashService.getStudentSchedule(this.user.identifier).subscribe({
      next: (res) => {
        this.scheduleItems = res.schedule ?? [];
        this.activeSemester = res.semester ?? '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });

    this.dashService.getStudentAnnouncements(this.user.department_id ?? 0).subscribe({
      next: (res) => { this.announcements = res.announcements ?? []; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  todaySchedule(): { start: string; end: string; code: string; name: string; instructor: string; room: string; status: string }[] {
    const days: Record<number, string> = { 0: 'Pazar', 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi' };
    const today = days[new Date().getDay()];
    const result: any[] = [];
    for (const item of this.scheduleItems) {
      for (const slot of item.schedule) {
        if (slot.day === today) {
          result.push({ start: slot.start_time, end: slot.end_time, code: item.course_code, name: item.course_name, instructor: item.instructor, room: slot.classroom, status: item.status });
        }
      }
    }
    return result.sort((a, b) => a.start.localeCompare(b.start));
  }

  weekSchedule(): { day: string; start: string; end: string; code: string; name: string; instructor: string; room: string }[] {
    const order: Record<string, number> = { 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6, 'Pazar': 7 };
    const result: any[] = [];
    for (const item of this.scheduleItems) {
      for (const slot of item.schedule) {
        result.push({ day: slot.day, start: slot.start_time, end: slot.end_time, code: item.course_code, name: item.course_name, instructor: item.instructor, room: slot.classroom });
      }
    }
    return result.sort((a, b) => (order[a.day] ?? 9) - (order[b.day] ?? 9) || a.start.localeCompare(b.start));
  }

  get gnoLabel(): string {
    const gpa = this.user?.gpa ?? 0;
    if (gpa >= 3.5) return 'ONUR BELGESİ';
    if (gpa >= 3.0) return 'YÜKSEK ONUR';
    return 'AKADEMİK DURUM';
  }

  get classLabel(): string {
    return `${this.user?.class_year ?? 1}. SINIF`;
  }

  get semester(): string {
    return this.user?.active_semester ?? `${(this.user?.class_year ?? 1) * 2}. Dönem`;
  }

  get credits(): number {
    return this.user?.total_credits ?? 0;
  }

  get firstName(): string {
    return this.user?.full_name?.split(' ')[0] ?? '';
  }

  setNav(nav: string) {
    this.activeNav = nav;
    this.selectedAnn = null;
    if (nav === 'notlar' && !this.transcript && !this.transcriptLoading) {
      this.loadTranscript();
    }
    if (nav === 'kampus' && this.allAnnouncements.length === 0 && !this.allAnnLoading) {
      this.loadAllAnnouncements();
    }
    if (nav === 'yoklama' && this.attendanceSummary.length === 0 && !this.attendanceLoading) {
      this.loadAttendance();
    }
    if (nav === 'odevler') { this.loadStudentAssignments(); }
  }

  loadStudentAssignments(): void {
    if (!this.user) return;
    this.assignmentsLoading = true;
    this.dashService.getStudentAssignments(this.user.identifier).subscribe({
      next: (res) => { this.studentAssignments = res.assignments ?? []; this.assignmentsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.assignmentsLoading = false; this.cdr.detectChanges(); },
    });
  }

  onFileSelected(event: Event, assignment: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles = Array.from(input.files);
      this.selectedUploadAssignment = assignment;
      this.uploadMsg = '';
      this.uploadSuccess = false;
      this.cdr.detectChanges();
    }
  }

  submitFile(assignment: any): void {
    if (!this.uploadFiles.length || !this.user || this.uploadProgress) return;
    this.uploadProgress = true;
    this.uploadMsg = '';
    this.dashService.submitAssignment(this.user.identifier, assignment.id, this.uploadFiles).subscribe({
      next: (res) => {
        this.uploadProgress = false;
        this.uploadSuccess = true;
        this.uploadMsg = res.message ?? 'Ödev başarıyla teslim edildi.';
        this.uploadFiles = [];
        this.selectedUploadAssignment = null;
        this.loadStudentAssignments();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadProgress = false;
        this.uploadSuccess = false;
        this.uploadMsg = err?.error?.message ?? 'Dosya yüklenemedi.';
        this.cdr.detectChanges();
      },
    });
  }

  isOverdue(dueDate: string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
  }

  acceptString(extensions: string[]): string {
    return (extensions ?? []).map(e => '.' + e).join(',');
  }

  cancelUpload(): void {
    this.uploadFiles = [];
    this.selectedUploadAssignment = null;
    this.uploadMsg = '';
  }

  get pendingAssignmentCount(): number {
    return this.studentAssignments.filter(a => !a.submitted && !this.isOverdue(a.due_date)).length;
  }

  loadAttendance(): void {
    if (!this.user) return;
    this.attendanceLoading = true;
    this.dashService.getStudentAttendance(this.user.identifier).subscribe({
      next: (res) => { this.attendanceSummary = res.attendance ?? []; this.attendanceLoading = false; this.cdr.detectChanges(); },
      error: () => { this.attendanceLoading = false; this.cdr.detectChanges(); },
    });
  }

  submitQr(): void {
    const token = this.qrTokenInput.trim();
    if (!token || !this.user || this.qrSubmitting) return;
    this.qrSubmitting = true;
    this.qrMessage = '';
    this.dashService.qrCheckin(token, this.user.identifier).subscribe({
      next: (res) => {
        this.qrSuccess = res.success;
        this.qrMessage = res.message;
        this.qrTokenInput = '';
        this.qrSubmitting = false;
        if (res.success) this.loadAttendance();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.qrSuccess = false;
        this.qrMessage = err?.error?.message ?? 'Bir hata oluştu';
        this.qrSubmitting = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadAllAnnouncements(): void {
    if (!this.user) return;
    this.allAnnLoading = true;
    this.dashService.getAllAnnouncements(this.user.department_id ?? 0).subscribe({
      next: (res) => { this.allAnnouncements = res.announcements ?? []; this.allAnnLoading = false; this.cdr.detectChanges(); },
      error: () => { this.allAnnLoading = false; this.cdr.detectChanges(); },
    });
  }

  openAnn(ann: AnnouncementItem): void {
    this.selectedAnn = ann;
    this.myReaction = null;
    this.myLiked = false;
    this.commentText = '';
    this.cdr.detectChanges();
  }

  closeAnn(): void { this.selectedAnn = null; this.cdr.detectChanges(); }

  toggleLike(): void {
    if (!this.selectedAnn || !this.user) return;
    this.dashService.likeAnnouncement(this.selectedAnn.id, this.user.identifier).subscribe({
      next: (res) => {
        if (this.selectedAnn) { this.selectedAnn.likes = res.likes; this.myLiked = res.liked; }
        this.cdr.detectChanges();
      },
    });
  }

  sendReact(emoji: string): void {
    if (!this.selectedAnn || !this.user) return;
    this.dashService.reactAnnouncement(this.selectedAnn.id, this.user.identifier, emoji).subscribe({
      next: (res) => {
        if (this.selectedAnn) { this.selectedAnn.reactions = res.reactions; this.myReaction = res.my_reaction; }
        this.cdr.detectChanges();
      },
    });
  }

  submitComment(): void {
    const text = this.commentText.trim();
    if (!text || !this.selectedAnn || !this.user || this.commentSubmitting) return;
    this.commentSubmitting = true;
    const name = this.user.full_name ?? 'Öğrenci';
    this.dashService.commentAnnouncement(this.selectedAnn.id, this.user.identifier, name, text).subscribe({
      next: (res) => {
        if (this.selectedAnn) this.selectedAnn.comments = [...this.selectedAnn.comments, res.comment];
        this.commentText = '';
        this.commentSubmitting = false;
        this.cdr.detectChanges();
      },
      error: () => { this.commentSubmitting = false; this.cdr.detectChanges(); },
    });
  }

  totalReactions(ann: AnnouncementItem): number {
    const r = ann.reactions;
    return (r?.like ?? 0) + (r?.love ?? 0) + (r?.wow ?? 0) + (r?.haha ?? 0);
  }

  loadTranscript(): void {
    if (!this.user) return;
    this.transcriptLoading = true;
    this.dashService.getTranscript(this.user.identifier).subscribe({
      next: (res) => {
        this.transcript = res;
        this.transcriptLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.transcriptLoading = false; this.cdr.detectChanges(); },
    });
  }

  gradeClass(letter: string | null): string {
    if (!letter) return '';
    if (['AA','BA','BB','CB','CC'].includes(letter)) return 'grade-pass';
    return 'grade-fail';
  }

  goToCourseRegistration() {
    this.router.navigate(['/student/course-registration']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
