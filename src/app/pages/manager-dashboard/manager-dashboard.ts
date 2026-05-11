import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, ManagerStats, ActivityItem, AnnouncementItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
})
export class ManagerDashboardComponent implements OnInit {
  user: UserInfo | null = null;
  activeNav = 'panel';
  loading = true;

  stats: ManagerStats = { students: 0, instructors: 0, courses: 0, departments: 0 };
  recentActivities: ActivityItem[] = [];
  announcements: AnnouncementItem[] = [];

  // Devamsızlık
  attOverview: any[] = [];
  attOverviewTotal = 0;
  attOverviewLoading = false;

  // Öğrenci
  students: any[] = [];
  studentsLoading = false;
  studentSearch = '';
  studentStatusFilter = '';
  editingStudent: any = null;

  // Akademisyen
  instructors: any[] = [];
  instructorsLoading = false;
  instructorSearch = '';
  editingInstructor: any = null;

  // Ders
  mgCourses: any[] = [];
  mgCoursesLoading = false;
  courseSearch = '';

  // Duyuru
  mgAnnouncements: any[] = [];
  mgAnnLoading = false;
  showAnnForm = false;
  annForm = { title: '', content: '', audience: 'all', priority: 'normal' };
  annSubmitting = false;
  annMsg = '';

  // Raporlar
  reports: any = null;
  reportsLoading = false;

  // Ayarlar
  semesters: any[] = [];
  mgDepartments: any[] = [];
  settingsLoading = false;
  semesterForm = { name: '', academic_year: '', type: 'guz', start_date: '', end_date: '' };
  semesterSubmitting = false;
  settingsMsg = '';

  private cdr = inject(ChangeDetectorRef);

  statCards: { label: string; key: keyof ManagerStats; color: string }[] = [
    { label: 'TOPLAM ÖĞRENCİ',  key: 'students',    color: 'blue'   },
    { label: 'AKADEMİSYEN',     key: 'instructors', color: 'purple' },
    { label: 'AKTİF DERS',      key: 'courses',     color: 'teal'   },
    { label: 'BÖLÜM',           key: 'departments', color: 'orange' },
  ];

  constructor(
    private authService: AuthService,
    private dashService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.dashService.getManagerStats().subscribe({
      next: (res) => { this.stats = res.stats; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.dashService.getManagerActivities().subscribe({
      next: (res) => { this.recentActivities = res.activities ?? []; },
    });
    this.dashService.getManagerAnnouncements().subscribe({
      next: (res) => { this.announcements = res.announcements ?? []; },
    });
  }

  get roleLabel(): string {
    const r = this.user?.manager_role;
    if (r === 'rector')           return 'Rektör';
    if (r === 'dean')             return 'Dekan';
    if (r === 'department_chair') return 'Bölüm Başkanı';
    return 'Yönetici';
  }

  get firstName(): string {
    return this.user?.full_name?.split(' ').slice(-1)[0] ?? '';
  }

  setNav(nav: string): void {
    this.activeNav = nav;
    this.editingStudent = null;
    this.editingInstructor = null;
    this.showAnnForm = false;

    if (nav === 'ogrenciler'     && !this.students.length)       this.loadStudents();
    if (nav === 'akademisyenler' && !this.instructors.length)    this.loadInstructors();
    if (nav === 'dersler'        && !this.mgCourses.length)      this.loadCourses();
    if (nav === 'duyurular'      && !this.mgAnnouncements.length) this.loadAnnouncements();
    if (nav === 'raporlar'       && !this.reports)               this.loadReports();
    if (nav === 'ayarlar'        && !this.semesters.length)      this.loadSettings();
    if (nav === 'devamsizlik'    && !this.attOverview.length)    this.loadAttOverview();
  }

  // ── Öğrenci ──────────────────────────────────────────
  loadStudents(): void {
    this.studentsLoading = true;
    this.dashService.getManagerStudents(this.studentSearch, this.studentStatusFilter).subscribe({
      next: (r) => { this.students = r.students ?? []; this.studentsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.studentsLoading = false; this.cdr.detectChanges(); },
    });
  }

  saveStudent(): void {
    if (!this.editingStudent) return;
    this.dashService.updateManagerStudent(this.editingStudent.student_no, {
      status: this.editingStudent.status,
      class_year: this.editingStudent.class_year,
    }).subscribe({
      next: () => {
        const idx = this.students.findIndex(s => s.student_no === this.editingStudent.student_no);
        if (idx >= 0) this.students[idx] = { ...this.students[idx], ...this.editingStudent };
        this.editingStudent = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Akademisyen ──────────────────────────────────────
  loadInstructors(): void {
    this.instructorsLoading = true;
    this.dashService.getManagerInstructors(this.instructorSearch).subscribe({
      next: (r) => { this.instructors = r.instructors ?? []; this.instructorsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.instructorsLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleInstructor(ins: any): void {
    this.dashService.updateManagerInstructor(ins.staff_id, { is_active: !ins.is_active }).subscribe({
      next: () => { ins.is_active = !ins.is_active; this.cdr.detectChanges(); },
    });
  }

  saveInstructor(): void {
    if (!this.editingInstructor) return;
    this.dashService.updateManagerInstructor(this.editingInstructor.staff_id, {
      title: this.editingInstructor.title,
    }).subscribe({
      next: () => {
        const idx = this.instructors.findIndex(i => i.staff_id === this.editingInstructor.staff_id);
        if (idx >= 0) this.instructors[idx] = { ...this.instructors[idx], ...this.editingInstructor };
        this.editingInstructor = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Ders ─────────────────────────────────────────────
  loadCourses(): void {
    this.mgCoursesLoading = true;
    this.dashService.getManagerCourses(this.courseSearch).subscribe({
      next: (r) => { this.mgCourses = r.courses ?? []; this.mgCoursesLoading = false; this.cdr.detectChanges(); },
      error: () => { this.mgCoursesLoading = false; this.cdr.detectChanges(); },
    });
  }

  toggleCourse(c: any): void {
    this.dashService.toggleManagerCourse(c.course_code).subscribe({
      next: (r) => { c.is_active = r.is_active; this.cdr.detectChanges(); },
    });
  }

  // ── Duyuru ───────────────────────────────────────────
  loadAnnouncements(): void {
    this.mgAnnLoading = true;
    this.dashService.getManagerAllAnnouncements().subscribe({
      next: (r) => { this.mgAnnouncements = r.announcements ?? []; this.mgAnnLoading = false; this.cdr.detectChanges(); },
      error: () => { this.mgAnnLoading = false; this.cdr.detectChanges(); },
    });
  }

  submitAnnouncement(): void {
    if (!this.annForm.title.trim() || !this.annForm.content.trim()) return;
    this.annSubmitting = true;
    this.dashService.createManagerAnnouncement({
      ...this.annForm,
      published_by: this.user?.identifier ?? '',
    }).subscribe({
      next: (r) => {
        this.annMsg = 'Duyuru yayınlandı!';
        this.annForm = { title: '', content: '', audience: 'all', priority: 'normal' };
        this.annSubmitting = false;
        this.showAnnForm = false;
        this.mgAnnouncements = [];
        this.loadAnnouncements();
        this.cdr.detectChanges();
      },
      error: () => { this.annSubmitting = false; this.cdr.detectChanges(); },
    });
  }

  toggleAnnouncement(ann: any): void {
    this.dashService.toggleManagerAnnouncement(ann.id).subscribe({
      next: (r) => { ann.is_active = r.is_active; this.cdr.detectChanges(); },
    });
  }

  deleteAnnouncement(ann: any): void {
    if (!confirm('Duyuruyu silmek istediğinize emin misiniz?')) return;
    this.dashService.deleteManagerAnnouncement(ann.id).subscribe({
      next: () => {
        this.mgAnnouncements = this.mgAnnouncements.filter(a => a.id !== ann.id);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Raporlar ─────────────────────────────────────────
  loadReports(): void {
    this.reportsLoading = true;
    this.dashService.getManagerReports().subscribe({
      next: (r) => { this.reports = r; this.reportsLoading = false; this.cdr.detectChanges(); },
      error: () => { this.reportsLoading = false; this.cdr.detectChanges(); },
    });
  }

  get gradeEntries(): { key: string; val: number }[] {
    if (!this.reports?.grade_distribution) return [];
    return Object.entries(this.reports.grade_distribution).map(([key, val]) => ({ key, val: val as number }));
  }

  // ── Ayarlar ──────────────────────────────────────────
  loadSettings(): void {
    this.settingsLoading = true;
    this.dashService.getManagerSettings().subscribe({
      next: (r) => {
        this.semesters = r.semesters ?? [];
        this.mgDepartments = r.departments ?? [];
        this.settingsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.settingsLoading = false; this.cdr.detectChanges(); },
    });
  }

  activateSemester(sem: any): void {
    this.dashService.activateManagerSemester(sem.id).subscribe({
      next: (r) => {
        this.semesters.forEach(s => s.is_active = false);
        sem.is_active = true;
        this.settingsMsg = r.message ?? 'Dönem aktifleştirildi';
        this.cdr.detectChanges();
      },
    });
  }

  submitSemester(): void {
    if (!this.semesterForm.name.trim()) return;
    this.semesterSubmitting = true;
    this.dashService.createManagerSemester(this.semesterForm).subscribe({
      next: () => {
        this.semesterSubmitting = false;
        this.semesterForm = { name: '', academic_year: '', type: 'guz', start_date: '', end_date: '' };
        this.semesters = [];
        this.loadSettings();
        this.cdr.detectChanges();
      },
      error: () => { this.semesterSubmitting = false; this.cdr.detectChanges(); },
    });
  }

  // ── Devamsızlık ──────────────────────────────────────
  loadAttOverview(): void {
    this.attOverviewLoading = true;
    this.dashService.getManagerAttendanceOverview().subscribe({
      next: (res) => {
        this.attOverview = res.courses ?? [];
        this.attOverviewTotal = res.total_sessions ?? 0;
        this.attOverviewLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.attOverviewLoading = false; this.cdr.detectChanges(); },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
