import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, ScheduleItem, AnnouncementItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [DecimalPipe],
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
    const days: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
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

  setNav(nav: string) { this.activeNav = nav; }

  goToCourseRegistration() {
    this.router.navigate(['/student/course-registration']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
